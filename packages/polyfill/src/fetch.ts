/**
 * Headers 类实现
 */
export class Headers implements globalThis.Headers {
  private _headers: Map<string, string[]> = new Map()

  constructor(init?: HeadersInit) {
    if (init) {
      if (init instanceof Headers) {
        init.forEach((value, key) => {
          this.append(key, value)
        })
      } else if (Array.isArray(init)) {
        for (const [key, value] of init) {
          this.append(key, value)
        }
      } else {
        for (const key in init) {
          if (Object.prototype.hasOwnProperty.call(init, key)) {
            this.set(key, (init as Record<string, string>)[key])
          }
        }
      }
    }
  }

  append(name: string, value: string): void {
    const key = name.toLowerCase()
    const existing = this._headers.get(key) || []
    existing.push(value)
    this._headers.set(key, existing)
  }

  delete(name: string): void {
    this._headers.delete(name.toLowerCase())
  }

  get(name: string): string | null {
    const values = this._headers.get(name.toLowerCase())
    return values ? values.join(', ') : null
  }

  has(name: string): boolean {
    return this._headers.has(name.toLowerCase())
  }

  set(name: string, value: string): void {
    this._headers.set(name.toLowerCase(), [value])
  }

  forEach(
    callbackfn: (value: string, key: string, parent: Headers) => void,
    thisArg?: any,
  ): void {
    this._headers.forEach((values, key) => {
      values.forEach(value => {
        callbackfn.call(thisArg, value, key, this)
      })
    })
  }

  *[Symbol.iterator](): IterableIterator<[string, string]> {
    for (const [key, values] of this._headers) {
      for (const value of values) {
        yield [key, value]
      }
    }
  }

  entries(): IterableIterator<[string, string]> {
    return this[Symbol.iterator]()
  }

  keys(): IterableIterator<string> {
    return this._headers.keys()
  }

  values(): IterableIterator<string> {
    const allValues: string[] = []
    this._headers.forEach(values => {
      allValues.push(...values)
    })
    return allValues[Symbol.iterator]()
  }

  getSetCookie(): string[] {
    const cookies = this._headers.get('set-cookie') || []
    return [...cookies]
  }
}

/**
 * Request 类实现
 */
export class Request implements Omit<
  globalThis.Request,
  'signal' | 'body' | 'bytes'
> {
  readonly method: string
  readonly url: string
  readonly headers: Headers
  readonly redirect: RequestRedirect
  readonly referrer: string
  readonly referrerPolicy: ReferrerPolicy
  readonly mode: RequestMode
  readonly credentials: RequestCredentials
  readonly cache: RequestCache
  readonly integrity: string
  readonly keepalive: boolean
  readonly destination: RequestDestination
  readonly priority: RequestPriority
  readonly duplex: 'half' | 'full'
  readonly _body: BodyInit | null
  readonly _signal: AbortSignal | null

  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (input instanceof Request) {
      this.url = input.url
      this.method = init?.method || input.method
      this.headers = new Headers(init?.headers || input.headers)
      this.redirect = init?.redirect || input.redirect
      this.referrer =
        init?.referrer !== undefined ? init.referrer : input.referrer
      this.referrerPolicy =
        init?.referrerPolicy !== undefined
          ? init.referrerPolicy
          : input.referrerPolicy
      this.mode = init?.mode !== undefined ? init.mode : input.mode
      this.credentials =
        init?.credentials !== undefined ? init.credentials : input.credentials
      this.cache = init?.cache !== undefined ? init.cache : input.cache
      this.integrity =
        init?.integrity !== undefined ? init.integrity : input.integrity
      this.keepalive =
        init?.keepalive !== undefined ? init.keepalive : input.keepalive
      this.destination =
        (init as any)?.destination !== undefined
          ? (init as any).destination
          : input.destination
      this.priority =
        init?.priority !== undefined ? init.priority : input.priority
      this.duplex =
        (init as any)?.duplex !== undefined
          ? (init as any).duplex
          : input.duplex
      this._body = init?.body !== undefined ? init.body : input._body
      this._signal = init?.signal || input._signal
    } else {
      this.url = typeof input === 'string' ? input : input.toString()
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers)
      this.redirect = init?.redirect || 'follow'
      this.referrer = init?.referrer || 'about:client'
      this.referrerPolicy = init?.referrerPolicy || ''
      this.mode = init?.mode || 'cors'
      this.credentials = init?.credentials || 'same-origin'
      this.cache = init?.cache || 'default'
      this.integrity = init?.integrity || ''
      this.keepalive = init?.keepalive || false
      this.destination = (init as any)?.destination || ''
      this.priority = init?.priority || 'auto'
      this.duplex = (init as any)?.duplex || 'half'
      this._body = init?.body || null
      this._signal = init?.signal || null
    }
  }

  get body(): ReadableStream<Uint8Array> | null {
    if (!this._body) return null
    if (this._body instanceof ReadableStream) return this._body
    // 对于其他类型的 body，返回 null（实际使用时需要转换）
    return null
  }

  get bodyUsed(): boolean {
    return false // 简化实现
  }

  get signal(): AbortSignal {
    return this._signal || new AbortController().signal
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(0))
  }

  blob(): Promise<Blob> {
    return Promise.resolve(new Blob())
  }

  formData(): Promise<FormData> {
    return Promise.resolve(new FormData())
  }

  json(): Promise<any> {
    return Promise.resolve({})
  }

  text(): Promise<string> {
    if (!this._body) {
      return Promise.resolve('')
    }
    if (typeof this._body === 'string') {
      return Promise.resolve(this._body)
    }
    if (this._body instanceof ArrayBuffer) {
      return Promise.resolve(new TextDecoder().decode(this._body))
    }
    if (this._body instanceof Uint8Array) {
      return Promise.resolve(new TextDecoder().decode(this._body))
    }
    return Promise.resolve('')
  }

  // @ts-expect-error - Polyfill implementation may not match exact types
  clone(): Request {
    return new Request(this as any) as any
  }
}

/**
 * Response 类实现
 */
export class Response implements Omit<globalThis.Response, 'body' | 'bytes'> {
  readonly status: number
  readonly statusText: string
  readonly headers: Headers
  readonly ok: boolean
  readonly redirected: boolean
  readonly type: ResponseType
  readonly url: string
  readonly _body: BodyInit | null

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.status = init?.status || 200
    this.statusText = init?.statusText || ''
    this.headers = new Headers(init?.headers)
    this.ok = this.status >= 200 && this.status < 300
    this.redirected = false
    this.type = 'default'
    this.url = ''
    this._body = body || null
  }

  get body(): ReadableStream<Uint8Array> | null {
    if (!this._body) return null
    if (this._body instanceof ReadableStream) return this._body
    return null
  }

  get bodyUsed(): boolean {
    return false
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    if (!this._body) {
      return Promise.resolve(new ArrayBuffer(0))
    }
    if (this._body instanceof ArrayBuffer) {
      return Promise.resolve(this._body)
    }
    if (this._body instanceof Uint8Array) {
      const buffer = this._body.buffer
      // 确保返回 ArrayBuffer 而不是 SharedArrayBuffer
      if (buffer instanceof SharedArrayBuffer) {
        return Promise.resolve(new ArrayBuffer(0))
      }
      return Promise.resolve(buffer)
    }
    if (typeof this._body === 'string') {
      const encoder = new TextEncoder()
      return Promise.resolve(encoder.encode(this._body).buffer)
    }
    return Promise.resolve(new ArrayBuffer(0))
  }

  blob(): Promise<Blob> {
    if (!this._body) {
      return Promise.resolve(new Blob())
    }
    if (this._body instanceof Blob) {
      return Promise.resolve(this._body)
    }
    return this.arrayBuffer().then(buffer => new Blob([buffer]))
  }

  formData(): Promise<FormData> {
    return Promise.resolve(new FormData())
  }

  json(): Promise<any> {
    return this.text().then(text => {
      try {
        return JSON.parse(text)
      } catch {
        throw new TypeError('Invalid JSON')
      }
    })
  }

  text(): Promise<string> {
    if (!this._body) {
      return Promise.resolve('')
    }
    if (typeof this._body === 'string') {
      return Promise.resolve(this._body)
    }
    if (this._body instanceof ArrayBuffer) {
      return Promise.resolve(new TextDecoder().decode(this._body))
    }
    if (this._body instanceof Uint8Array) {
      return Promise.resolve(new TextDecoder().decode(this._body))
    }
    return Promise.resolve('')
  }

  // @ts-expect-error - Polyfill implementation may not match exact types
  clone(): Response {
    return new Response(this._body as any, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers as any,
    }) as any
  }

  static error(): Response {
    return new Response(null, { status: 0, statusText: '' })
  }

  static redirect(url: string | URL, status?: number): Response {
    return new Response(null, {
      status: status || 302,
      statusText: 'Found',
      headers: { Location: typeof url === 'string' ? url : url.toString() },
    })
  }

  static json(data: any, init?: ResponseInit): Response {
    const body = JSON.stringify(data)
    const headers = new Headers(init?.headers)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    return new Response(body, { ...init, headers })
  }
}

/**
 * 浏览器环境下的 fetch 实现（使用 XMLHttpRequest）
 */
function fetchBrowser(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = new Request(input, init)
    const xhr = new XMLHttpRequest()

    // 设置 AbortSignal
    if (request._signal) {
      if (request._signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      request._signal.addEventListener('abort', () => {
        xhr.abort()
        reject(new DOMException('Aborted', 'AbortError'))
      })
    }

    xhr.open(request.method, request.url, true)

    // 设置请求头
    request.headers.forEach((value, key) => {
      try {
        xhr.setRequestHeader(key, value)
      } catch (e) {
        // 某些头可能无法设置，忽略错误
      }
    })

    // 设置响应类型
    xhr.responseType = 'arraybuffer'

    xhr.onload = () => {
      const headers = new Headers()
      const headerString = xhr.getAllResponseHeaders()
      if (headerString) {
        headerString.split('\r\n').forEach(line => {
          const parts = line.split(': ')
          if (parts.length === 2) {
            headers.append(parts[0], parts[1])
          }
        })
      }

      const body = xhr.response
        ? new Uint8Array(xhr.response as ArrayBuffer)
        : null

      const response = new Response(body, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers,
      })

      resolve(response)
    }

    xhr.onerror = () => {
      reject(new TypeError('Network request failed'))
    }

    xhr.ontimeout = () => {
      reject(new TypeError('Network request timeout'))
    }

    // 发送请求体
    if (request._body) {
      if (typeof request._body === 'string') {
        xhr.send(request._body)
      } else if (request._body instanceof ArrayBuffer) {
        xhr.send(request._body)
      } else if (request._body instanceof Uint8Array) {
        const buffer = request._body.buffer
        if (buffer instanceof SharedArrayBuffer) {
          // SharedArrayBuffer 不能直接发送，转换为普通 ArrayBuffer
          const newBuffer = new ArrayBuffer(buffer.byteLength)
          new Uint8Array(newBuffer).set(new Uint8Array(buffer))
          xhr.send(newBuffer)
        } else {
          xhr.send(buffer)
        }
      } else if (request._body instanceof Blob) {
        xhr.send(request._body)
      } else if (request._body instanceof FormData) {
        xhr.send(request._body)
      } else {
        xhr.send()
      }
    } else {
      xhr.send()
    }
  })
}

/**
 * fetch 函数 - 浏览器环境下的实现
 */
export function fetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetchBrowser(input, init)
}

// 导出默认 fetch
export default fetch

// 直接覆盖 window.fetch
const win = (globalThis as any).window
if (
  typeof win !== 'undefined' &&
  (!win.fetch || !win.fetch.toString().includes('[native code]'))
) {
  win.fetch = fetchBrowser
  // eslint-disable-next-line no-console
  console.log('polyfilled fetch')
} else {
  // eslint-disable-next-line no-console
  console.log('no need to polyfill fetch')
}
