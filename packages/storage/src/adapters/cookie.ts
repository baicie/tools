import type { StorageAdapter } from '../types'
import { createMemoryAdapter } from './memory'

export interface CookieAdapterOptions {
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
  maxAgeSeconds?: number
  expires?: Date
  documentRef?: Document
}

export function createCookieAdapter(
  options?: CookieAdapterOptions,
): StorageAdapter {
  var resolvedOptions = options || {}
  var doc = resolveDocument(resolvedOptions.documentRef)
  if (!doc) {
    return createMemoryAdapter('cookie-fallback')
  }
  var activeDocument = doc
  var adapterId = 'cookie-storage'

  function read(key: string) {
    var map = readAllCookies(activeDocument)
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return Promise.resolve(map[key])
    }
    return Promise.resolve(null)
  }

  function write(key: string, value: string) {
    activeDocument.cookie = serializeEntry(key, value, resolvedOptions)
    return Promise.resolve()
  }

  function remove(key: string) {
    activeDocument.cookie = serializeEntry(key, '', {
      path: resolvedOptions.path,
      domain: resolvedOptions.domain,
      secure: resolvedOptions.secure,
      sameSite: resolvedOptions.sameSite,
      maxAgeSeconds: 0,
    })
    return Promise.resolve()
  }

  function clear() {
    return keys().then(function (cookieKeys) {
      var tasks: Array<Promise<void>> = []
      var index = 0
      while (index < cookieKeys.length) {
        tasks.push(remove(cookieKeys[index]))
        index += 1
      }
      return Promise.all(tasks).then(function () {
        return undefined
      })
    })
  }

  function keys() {
    var map = readAllCookies(activeDocument)
    return Promise.resolve(Object.keys(map))
  }

  return {
    id: adapterId,
    read,
    write,
    remove,
    clear,
    keys,
  }
}

function resolveDocument(documentRef?: Document) {
  if (documentRef) {
    return documentRef
  }
  if (
    typeof globalThis !== 'undefined' &&
    (globalThis as Record<string, unknown>).document
  ) {
    var candidate = (globalThis as unknown as { document?: Document }).document
    return candidate
  }
  return undefined
}

interface CookieMap {
  [key: string]: string
}

function readAllCookies(doc: Document): CookieMap {
  var result: CookieMap = {}
  var raw = doc.cookie || ''
  if (!raw) {
    return result
  }
  var segments = raw.split(';')
  var index = 0
  while (index < segments.length) {
    var segment = segments[index].trim()
    if (segment.length === 0) {
      index += 1
      continue
    }
    var separatorIndex = segment.indexOf('=')
    var key = separatorIndex >= 0 ? segment.slice(0, separatorIndex) : segment
    var value = separatorIndex >= 0 ? segment.slice(separatorIndex + 1) : ''
    result[decodeURIComponentSafe(key)] = decodeURIComponentSafe(value)
    index += 1
  }
  return result
}

function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value)
  } catch (_error) {
    return value
  }
}

function serializeEntry(
  key: string,
  value: string,
  options: CookieAdapterOptions,
) {
  var directives: string[] = []
  directives.push(encodeURIComponent(key) + '=' + encodeURIComponent(value))
  directives.push('path=' + (options.path || '/'))
  if (options.domain) {
    directives.push('domain=' + options.domain)
  }
  if (typeof options.maxAgeSeconds === 'number') {
    directives.push('max-age=' + options.maxAgeSeconds)
  }
  if (options.expires) {
    directives.push('expires=' + options.expires.toUTCString())
  }
  if (options.secure) {
    directives.push('Secure')
  }
  if (options.sameSite) {
    directives.push('SameSite=' + options.sameSite)
  }
  return directives.join('; ')
}
