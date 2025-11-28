import './style.css'
import {
  type StorageBinding,
  type StorageStore,
  WILDCARD_KEY,
  createJSONCodec,
  createLocalStorageAdapter,
  createMemoryAdapter,
  createSessionStorageAdapter,
  createStorageStore,
} from '@baicie/storage'

type AdapterKind = 'local' | 'session' | 'memory'

interface AdapterMeta {
  label: string
  create: () => StorageStore
}

const defaultKey = 'demo-item'
const adapterMap: Record<AdapterKind, AdapterMeta> = {
  local: {
    label: 'localStorage',
    create: function () {
      return createStorageStore(createLocalStorageAdapter())
    },
  },
  session: {
    label: 'sessionStorage',
    create: function () {
      return createStorageStore(createSessionStorageAdapter())
    },
  },
  memory: {
    label: 'memory',
    create: function () {
      return createStorageStore(createMemoryAdapter('playground'))
    },
  },
}

const jsonCodec = createJSONCodec<unknown>()

var store = adapterMap.local.create()
var binding: StorageBinding<unknown> | null = null
var unsubscribeBinding: (() => void) | undefined
var unsubscribeWildcard: (() => void) | undefined

const splashTemplate = `
  <main class="layout">
    <section class="hero">
      <div class="badge">Playground</div>
      <h1>@baicie/storage 响应式存储示例</h1>
      <p>切换不同适配器，读写同一个 key，实时观察事件广播结果。</p>
      <div class="status-line">
        <span>当前适配器：<strong id="adapterLabel">${adapterMap.local.label}</strong></span>
        <span>绑定 key：<strong id="currentKey">${defaultKey}</strong></span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-title">配置</div>
      <div class="controls">
        <div>
          <label for="adapterSelect">适配器</label>
          <select id="adapterSelect">
            <option value="local">localStorage</option>
            <option value="session">sessionStorage</option>
            <option value="memory">memory</option>
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
        <button id="clearButton" class="danger">清空当前适配器</button>
      </div>
      <div class="result-line" id="resultOutput">准备就绪。</div>
    </section>

    <section class="grid">
      <div class="panel">
        <div class="panel-title">绑定实时值</div>
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

adapterSelect.value = 'local'
keyInput.value = defaultKey
valueInput.value = JSON.stringify(
  { user: 'baicie', visitedAt: new Date().toISOString(), count: 1 },
  null,
  2,
)

subscribeWildcard()
refreshBinding()
pushLog('adapter', 'localStorage 就绪')

adapterSelect.addEventListener('change', function () {
  var nextKind = adapterSelect.value as AdapterKind
  switchAdapter(nextKind)
})

keyInput.addEventListener('input', function () {
  refreshBinding()
})

writeButton.addEventListener('click', function () {
  var payload = parseInput(valueInput.value)
  var targetBinding = ensureBinding()
  targetBinding
    .write(payload)
    .then(function () {
      setResult('写入成功：' + formatValue(payload))
    })
    .then(refreshBinding)
    .catch(function (error) {
      setResult('写入失败：' + resolveErrorMessage(error))
    })
})

readButton.addEventListener('click', function () {
  var targetBinding = ensureBinding()
  targetBinding
    .read()
    .then(function (value) {
      setResult('当前值：' + formatValue(value))
    })
    .catch(function (error) {
      setResult('读取失败：' + resolveErrorMessage(error))
    })
})

removeButton.addEventListener('click', function () {
  var targetBinding = ensureBinding()
  targetBinding
    .remove()
    .then(function () {
      setResult('已删除 key：' + currentKeyLabel.textContent)
    })
    .catch(function (error) {
      setResult('删除失败：' + resolveErrorMessage(error))
    })
})

clearButton.addEventListener('click', function () {
  store
    .clear()
    .then(function () {
      setResult('当前适配器数据已清空')
    })
    .catch(function (error) {
      setResult('清空失败：' + resolveErrorMessage(error))
    })
})

function switchAdapter(kind: AdapterKind) {
  disposeListeners()
  store.dispose()
  store = adapterMap[kind].create()
  adapterLabel.textContent = adapterMap[kind].label
  subscribeWildcard()
  refreshBinding()
  setResult('已切换到 ' + adapterMap[kind].label)
  pushLog('adapter', '切换至 ' + adapterMap[kind].label)
}

function subscribeWildcard() {
  if (typeof unsubscribeWildcard === 'function') {
    unsubscribeWildcard()
  }
  unsubscribeWildcard = store.subscribe(WILDCARD_KEY, function (change) {
    var details = change.key + ' → ' + formatRawValue(change.value)
    pushLog(change.type, details)
  })
}

function refreshBinding() {
  if (typeof unsubscribeBinding === 'function') {
    unsubscribeBinding()
    unsubscribeBinding = undefined
  }
  var nextKey = normalizeKey(keyInput.value)
  keyInput.value = nextKey
  currentKeyLabel.textContent = nextKey
  binding = store.bind(nextKey, jsonCodec)
  binding.read().then(renderBindingValue)
  unsubscribeBinding = binding.subscribe(function (value) {
    renderBindingValue(value)
  })
}

function disposeListeners() {
  if (typeof unsubscribeBinding === 'function') {
    unsubscribeBinding()
    unsubscribeBinding = undefined
  }
  if (typeof unsubscribeWildcard === 'function') {
    unsubscribeWildcard()
    unsubscribeWildcard = undefined
  }
}

function parseInput(raw: string) {
  var trimmed = raw.trim()
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
  var trimmed = raw.trim()
  if (!trimmed) {
    return defaultKey
  }
  return trimmed
}

function ensureBinding() {
  if (!binding) {
    throw new Error('绑定尚未准备好')
  }
  return binding
}

function renderBindingValue(value: unknown) {
  bindingValue.textContent = formatValue(value)
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
  var trimmed = value.trim()
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
  var entry = document.createElement('li')
  entry.className = 'log-entry'

  var badge = document.createElement('span')
  badge.className = 'badge'
  badge.textContent = eventType

  var text = document.createElement('span')
  text.textContent = message

  entry.appendChild(badge)
  entry.appendChild(text)
  logList.prepend(entry)

  var limit = 12
  while (logList.children.length > limit) {
    var lastChild = logList.lastElementChild
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
