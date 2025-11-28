import './style.css'
import { subscribeStorageChanges } from '@baicie/storage'

type StorageKind = 'local' | 'session'

interface StorageMeta {
  label: string
  source: string
  resolve(): Storage
}

const defaultKey = 'demo-item'
const storageMap: Record<StorageKind, StorageMeta> = {
  local: {
    label: 'localStorage',
    source: 'local-storage',
    resolve: function () {
      if (typeof window === 'undefined' || !window.localStorage) {
        throw new Error('localStorage 不可用')
      }
      return window.localStorage
    },
  },
  session: {
    label: 'sessionStorage',
    source: 'session-storage',
    resolve: function () {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        throw new Error('sessionStorage 不可用')
      }
      return window.sessionStorage
    },
  },
}

let activeKind: StorageKind = 'local'
let currentKey = defaultKey

const splashTemplate = `
  <main class="layout">
    <section class="hero">
      <div class="badge">Playground</div>
      <h1>@baicie/storage 原生劫持演示</h1>
      <p>业务照常使用 Web Storage，本面板仅通过订阅获取通知。</p>
      <div class="status-line">
        <span>当前存储：<strong id="adapterLabel">${storageMap.local.label}</strong></span>
        <span>监听 key：<strong id="currentKey">${defaultKey}</strong></span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-title">配置</div>
      <div class="controls">
        <div>
          <label for="adapterSelect">目标 Storage</label>
          <select id="adapterSelect">
            <option value="local">localStorage</option>
            <option value="session">sessionStorage</option>
          </select>
        </div>
        <div>
          <label for="keyInput">Key</label>
          <input id="keyInput" placeholder="demo key" />
        </div>
  <div>
          <label for="valueInput">Value（JSON 或 字符串）</label>
          <textarea id="valueInput" spellcheck="false"></textarea>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-title">操作</div>
      <div class="actions">
        <button id="writeButton">写入 / 覆盖</button>
        <button id="readButton" class="secondary">读取</button>
        <button id="removeButton" class="secondary">删除当前 key</button>
        <button id="clearButton" class="danger">清空当前 Storage</button>
      </div>
      <div class="result-line" id="resultOutput">等待操作…</div>
    </section>

    <section class="grid">
      <div class="panel">
        <div class="panel-title">当前值</div>
        <pre id="bindingValue">null</pre>
    </div>
      <div class="panel">
        <div class="panel-title">事件流（最新在前）</div>
        <ul class="logs" id="logList"></ul>
  </div>
    </section>
  </main>
`

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('无法找到 #app 容器')
}
app.innerHTML = splashTemplate

const adapterSelect = document.getElementById(
  'adapterSelect',
) as HTMLSelectElement
const keyInput = document.getElementById('keyInput') as HTMLInputElement
const valueInput = document.getElementById('valueInput') as HTMLTextAreaElement
const writeButton = document.getElementById('writeButton') as HTMLButtonElement
const readButton = document.getElementById('readButton') as HTMLButtonElement
const removeButton = document.getElementById(
  'removeButton',
) as HTMLButtonElement
const clearButton = document.getElementById('clearButton') as HTMLButtonElement
const resultOutput = document.getElementById('resultOutput') as HTMLElement
const bindingValue = document.getElementById('bindingValue') as HTMLElement
const logList = document.getElementById('logList') as HTMLUListElement
const adapterLabel = document.getElementById('adapterLabel') as HTMLElement
const currentKeyLabel = document.getElementById('currentKey') as HTMLElement

adapterSelect.value = activeKind
keyInput.value = defaultKey
valueInput.value = JSON.stringify(
  { user: 'baicie', visitedAt: new Date().toISOString(), count: 1 },
  null,
  2,
)

const unsubscribe = subscribeStorageChanges(function (change) {
  pushLog(
    change.type,
    `${change.source} · ${change.key} -> ${formatRawValue(change.value)}`,
  )
  if (
    change.source === storageMap[activeKind].source &&
    change.key === currentKey
  ) {
    bindingValue.textContent = formatValue(parseInput(change.value ?? ''))
  }
})

renderCurrentValue()

adapterSelect.addEventListener('change', function () {
  activeKind = adapterSelect.value as StorageKind
  adapterLabel.textContent = storageMap[activeKind].label
  renderCurrentValue()
  setResult('已切换到 ' + storageMap[activeKind].label)
})

keyInput.addEventListener('input', function () {
  currentKey = normalizeKey(keyInput.value)
  keyInput.value = currentKey
  currentKeyLabel.textContent = currentKey
  renderCurrentValue()
})

writeButton.addEventListener('click', function () {
  try {
    const payload = parseInput(valueInput.value)
    const storage = resolveStorage()
    if (payload === null) {
      storage.setItem(currentKey, '')
    } else if (typeof payload === 'string') {
      storage.setItem(currentKey, payload)
    } else {
      storage.setItem(currentKey, JSON.stringify(payload))
    }
    setResult('写入成功')
    renderCurrentValue()
  } catch (error) {
    setResult('写入失败：' + resolveErrorMessage(error))
  }
})

readButton.addEventListener('click', function () {
  try {
    const storage = resolveStorage()
    const value = storage.getItem(currentKey)
    setResult('读取结果：' + formatRawValue(value))
  } catch (error) {
    setResult('读取失败：' + resolveErrorMessage(error))
  }
})

removeButton.addEventListener('click', function () {
  try {
    resolveStorage().removeItem(currentKey)
    setResult('已删除 ' + currentKey)
    renderCurrentValue()
  } catch (error) {
    setResult('删除失败：' + resolveErrorMessage(error))
  }
})

clearButton.addEventListener('click', function () {
  try {
    resolveStorage().clear()
    setResult('已清空 ' + storageMap[activeKind].label)
    renderCurrentValue()
  } catch (error) {
    setResult('清空失败：' + resolveErrorMessage(error))
  }
})

function resolveStorage() {
  return storageMap[activeKind].resolve()
}

function renderCurrentValue() {
  try {
    const value = resolveStorage().getItem(currentKey)
    bindingValue.textContent = formatValue(parseInput(value || ''))
  } catch (_error) {
    bindingValue.textContent = '无法读取'
  }
}

function parseInput(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  try {
    return JSON.parse(trimmed)
  } catch (_error) {
    return trimmed
  }
}

function normalizeKey(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) {
    return defaultKey
  }
  return trimmed
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return 'null'
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch (_error) {
    return String(value)
  }
}

function formatRawValue(value: string | null) {
  if (value === null) {
    return 'null'
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return '""'
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch (_error) {
    return value
  }
}

function setResult(message: string) {
  resultOutput.textContent = message
}

function pushLog(eventType: string, message: string) {
  const entry = document.createElement('li')
  entry.className = 'log-entry'

  const badge = document.createElement('span')
  badge.className = 'badge'
  badge.textContent = eventType

  const text = document.createElement('span')
  text.textContent = message

  entry.appendChild(badge)
  entry.appendChild(text)
  logList.prepend(entry)

  const limit = 12
  while (logList.children.length > limit) {
    const lastChild = logList.lastElementChild
    if (!lastChild) {
      break
    }
    logList.removeChild(lastChild)
  }
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  try {
    return JSON.stringify(error)
  } catch (_error) {
    return String(error)
  }
}

window.addEventListener('beforeunload', () => {
  unsubscribe()
})
