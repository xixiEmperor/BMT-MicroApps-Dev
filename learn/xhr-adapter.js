/**
 * Axios XHR 适配器源码学习
 * 这是axios在浏览器环境下使用XMLHttpRequest发送HTTP请求的核心实现
 */

// XHR适配器主函数
function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    let requestData = config.data
    const requestHeaders = config.headers
    const responseType = config.responseType

    // 如果是FormData，删除Content-Type让浏览器自己设置
    if (requestData instanceof FormData) {
      delete requestHeaders['Content-Type']
    }

    // 创建XMLHttpRequest实例
    let request = new XMLHttpRequest()

    // HTTP基础认证
    if (config.auth) {
      const username = config.auth.username || ''
      const password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : ''
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password)
    }

    // 构建完整URL
    const fullPath = buildFullPath(config.baseURL, config.url)

    // 初始化请求
    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true)

    // 设置请求超时
    request.timeout = config.timeout

    function onloadend() {
      if (!request) {
        return
      }

      // 准备响应数据
      const responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null
      const responseData = !responseType || responseType === 'text' || responseType === 'json'
        ? request.responseText
        : request.response

      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      }

      settle(function _resolve(value) {
        resolve(value)
      }, function _reject(err) {
        reject(err)
      }, response)

      // 清理request
      request = null
    }

    if ('onloadend' in request) {
      // 使用onloadend如果可用
      request.onloadend = onloadend
    } else {
      // 监听readystatechange事件作为后备
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return
        }

        // 文件协议的请求状态为0，但实际是成功的
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return
        }

        // readystate处理程序在下一个'tick'中调用onloadend
        setTimeout(onloadend)
      }
    }

    // 处理浏览器请求取消（与手动取消相对）
    request.onabort = function handleAbort() {
      if (request) {
        reject(createError('Request aborted', config, 'ECONNABORTED', request))
        request = null
      }
    }

    // 处理低级网络错误
    request.onerror = function handleError() {
      reject(createError('Network Error', config, null, request))
      request = null
    }

    // 处理超时
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded'
      const transitional = config.transitional || {}
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage
      }
      reject(createError(
        timeoutErrorMessage,
        config,
        transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
        request))
      request = null
    }

    // 添加xsrf header
    // 这只在标准浏览器环境中进行
    // 具体来说，不在web worker或react-native中
    if (typeof window !== 'undefined' && window.document) {
      // 获取cookie中的xsrf token
      const xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName
        ? cookies.read(config.xsrfCookieName)
        : undefined

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue
      }
    }

    // 添加headers到请求
    if ('setRequestHeader' in request) {
      Object.keys(requestHeaders).forEach(function setRequestHeader(key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // 如果没有数据，移除content-type
          delete requestHeaders[key]
        } else {
          // 否则添加header到请求
          request.setRequestHeader(key, requestHeaders[key])
        }
      })
    }

    // 添加withCredentials到请求如果需要
    if (!isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials
    }

    // 添加responseType到请求如果需要
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType
    }

    // 处理上传进度如果需要
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress)
    }

    // 处理下载进度如果需要
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress)
    }

    // 如果没有数据，不发送undefined
    if (requestData === undefined) {
      requestData = null
    }

    // 发送请求
    request.send(requestData)
  })
}

// 工具函数：构建完整路径
function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL)
  }
  return requestedURL
}

// 工具函数：检查是否为绝对URL
function isAbsoluteURL(url) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)
}

// 工具函数：合并URLs
function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL
}

// 工具函数：构建URL（包含查询参数）
function buildURL(url, params, paramsSerializer) {
  if (!params) {
    return url
  }

  let serializedParams
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params)
  } else if (isURLSearchParams(params)) {
    serializedParams = params.toString()
  } else {
    const parts = []

    Object.keys(params).forEach(function serialize(key) {
      let val = params[key]
      if (val === null || typeof val === 'undefined') {
        return
      }

      if (Array.isArray(val)) {
        key = key + '[]'
      } else {
        val = [val]
      }

      val.forEach(function parseValue(v) {
        if (isDate(v)) {
          v = v.toISOString()
        } else if (isObject(v)) {
          v = JSON.stringify(v)
        }
        parts.push(encode(key) + '=' + encode(v))
      })
    })

    serializedParams = parts.join('&')
  }

  if (serializedParams) {
    const hashmarkIndex = url.indexOf('#')
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex)
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams
  }

  return url
}

// 工具函数：URL编码
function encode(val) {
  return encodeURIComponent(val)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
}

// 工具函数：解析响应headers
function parseHeaders(headers) {
  const parsed = {}
  let key
  let val
  let i

  if (!headers) {
    return parsed
  }

  headers.split('\n').forEach(function parser(line) {
    i = line.indexOf(':')
    key = trim(line.substr(0, i)).toLowerCase()
    val = trim(line.substr(i + 1))

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val])
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val
      }
    }
  })

  return parsed
}

const ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
]

// 工具函数：去除字符串首尾空白
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '')
}

// 工具函数：处理响应状态
function settle(resolve, reject, response) {
  const validateStatus = response.config.validateStatus
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response)
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ))
  }
}

// 工具函数：创建错误对象
function createError(message, config, code, request, response) {
  const error = new Error(message)
  return enhanceError(error, config, code, request, response)
}

// 工具函数：增强错误对象
function enhanceError(error, config, code, request, response) {
  error.config = config
  if (code) {
    error.code = code
  }

  error.request = request
  error.response = response
  error.isAxiosError = true

  error.toJSON = function toJSON() {
    return {
      message: this.message,
      name: this.name,
      description: this.description,
      number: this.number,
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      config: this.config,
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    }
  }
  return error
}

// 工具函数：检查是否为URLSearchParams
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams
}

// 工具函数：检查是否为Date对象
function isDate(val) {
  return Object.prototype.toString.call(val) === '[object Date]'
}

// 工具函数：检查是否为对象
function isObject(val) {
  return val !== null && typeof val === 'object'
}

// 工具函数：检查是否为undefined
function isUndefined(val) {
  return typeof val === 'undefined'
}

// 检查URL是否同源
const isURLSameOrigin = (function standardBrowserEnv() {
  const msie = /(msie|trident)/i.test(navigator.userAgent)
  const urlParsingNode = document.createElement('a')
  let originURL

  // 解析URL
  function resolveURL(url) {
    let href = url

    if (msie) {
      // IE需要设置href两次来规范化属性
      urlParsingNode.setAttribute('href', href)
      href = urlParsingNode.href
    }

    urlParsingNode.setAttribute('href', href)

    return {
      href: urlParsingNode.href,
      protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
      host: urlParsingNode.host,
      search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
      hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
      hostname: urlParsingNode.hostname,
      port: urlParsingNode.port,
      pathname: (urlParsingNode.pathname.charAt(0) === '/') ? urlParsingNode.pathname : '/' + urlParsingNode.pathname
    }
  }

  originURL = resolveURL(window.location.href)

  return function isURLSameOrigin(requestURL) {
    const parsed = (typeof requestURL === 'string') ? resolveURL(requestURL) : requestURL
    return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host)
  }
})()

// Cookie工具
const cookies = {
  write: function write(name, value, expires, path, domain, secure) {
    const cookie = []
    cookie.push(name + '=' + encodeURIComponent(value))

    if (isNumber(expires)) {
      cookie.push('expires=' + new Date(expires).toGMTString())
    }

    if (isString(path)) {
      cookie.push('path=' + path)
    }

    if (isString(domain)) {
      cookie.push('domain=' + domain)
    }

    if (secure === true) {
      cookie.push('secure')
    }

    document.cookie = cookie.join('; ')
  },

  read: function read(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'))
    return (match ? decodeURIComponent(match[3]) : null)
  },

  remove: function remove(name) {
    this.write(name, '', Date.now() - 86400000)
  }
}

// 工具函数：检查是否为数字
function isNumber(val) {
  return typeof val === 'number'
}

// 工具函数：检查是否为字符串
function isString(val) {
  return typeof val === 'string'
}

module.exports = xhrAdapter
