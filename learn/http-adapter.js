/**
 * Axios HTTP 适配器源码学习 (Node.js环境)
 * 这是axios在Node.js环境下使用http/https模块发送HTTP请求的核心实现
 */

const http = require('http')
const https = require('https')
const url = require('url')
const zlib = require('zlib')

// HTTP适配器主函数
function httpAdapter(config) {
  return new Promise(function dispatchHttpRequest(resolvePromise, rejectPromise) {
    let timer
    let resolve = function resolve(value) {
      clearTimeout(timer)
      resolvePromise(value)
    }
    let reject = function reject(value) {
      clearTimeout(timer)
      rejectPromise(value)
    }

    let data = config.data
    const headers = config.headers

    // 设置User-Agent (仅在Node.js环境中)
    if ('user-agent' in headers) {
      // User-Agent在Node.js中是特殊的，需要单独处理
      if (!headers['user-agent'] && !headers['User-Agent']) {
        delete headers['user-agent']
      }
    }

    // 处理请求数据
    if (data && !isStream(data)) {
      if (Buffer.isBuffer(data)) {
        // 数据已经是Buffer
      } else if (typeof data === 'string') {
        data = Buffer.from(data, 'utf8')
      } else {
        data = Buffer.from(JSON.stringify(data), 'utf8')
      }

      // 设置Content-Length
      headers['Content-Length'] = data.length
    }

    // HTTP基础认证
    let auth = undefined
    if (config.auth) {
      const username = config.auth.username || ''
      const password = config.auth.password || ''
      auth = username + ':' + password
    }

    // 解析URL
    const fullPath = buildFullPath(config.baseURL, config.url)
    const parsed = url.parse(fullPath)
    const protocol = parsed.protocol || 'http:'

    if (!auth && parsed.auth) {
      const urlAuth = parsed.auth.split(':')
      const urlUsername = urlAuth[0] || ''
      const urlPassword = urlAuth[1] || ''
      auth = urlUsername + ':' + urlPassword
    }

    if (auth && !headers.Authorization) {
      headers.Authorization = 'Basic ' + Buffer.from(auth, 'utf8').toString('base64')
    }

    const isHttpsRequest = protocol === 'https:'
    const agent = isHttpsRequest ? config.httpsAgent : config.httpAgent

    const options = {
      path: buildURL(parsed.path, config.params, config.paramsSerializer),
      method: config.method.toUpperCase(),
      headers: headers,
      agent: agent,
      agents: { http: config.httpAgent, https: config.httpsAgent },
      auth: auth
    }

    if (config.socketPath) {
      options.socketPath = config.socketPath
    } else {
      options.hostname = parsed.hostname
      options.port = parsed.port
    }

    const transport = isHttpsRequest ? https : http
    let req

    // 处理代理
    if (config.proxy) {
      const proxyAgent = isHttpsRequest ?
        require('https-proxy-agent') :
        require('http-proxy-agent')

      options.agent = new proxyAgent(config.proxy)
    }

    // 创建请求
    req = transport.request(options, function handleResponse(res) {
      if (req.aborted) return

      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // 这里简化处理，实际axios有更复杂的重定向逻辑
        reject(createError('Request redirected', config, null, req))
        return
      }

      // 处理响应流
      let stream = res

      // 处理gzip压缩
      const lastRequest = res.req || req
      if (lastRequest.method !== 'HEAD' && res.statusCode !== 204 && config.decompress !== false) {
        if (res.headers['content-encoding'] === 'gzip') {
          stream = stream.pipe(zlib.createGunzip())
        } else if (res.headers['content-encoding'] === 'deflate') {
          stream = stream.pipe(zlib.createInflate())
        }
      }

      const response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: res.headers,
        config: config,
        request: req
      }

      if (config.responseType === 'stream') {
        response.data = stream
      } else {
        const responseBuffer = []
        let totalResponseBytes = 0

        stream.on('data', function handleStreamData(chunk) {
          responseBuffer.push(chunk)
          totalResponseBytes += chunk.length

          // 检查最大内容长度
          if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
            stream.destroy()
            reject(createError('maxContentLength size exceeded', config, null, req))
            return
          }
        })

        stream.on('error', function handleStreamError(err) {
          if (req.aborted) return
          reject(enhanceError(err, config, null, req))
        })

        stream.on('end', function handleStreamEnd() {
          let responseData = Buffer.concat(responseBuffer)

          if (config.responseType !== 'arraybuffer') {
            responseData = responseData.toString(config.responseEncoding || 'utf8')

            if (config.responseType === 'json') {
              try {
                responseData = JSON.parse(responseData)
              } catch (err) {
                reject(enhanceError(err, config, 'ECONNABORTED', req))
                return
              }
            }
          }

          response.data = responseData
          settle(resolve, reject, response)
        })
      }
    })

    // 处理请求错误
    req.on('error', function handleRequestError(err) {
      if (req.aborted && err.code !== 'ERR_FR_SCHEME_REJECTED') return
      reject(enhanceError(err, config, null, req))
    })

    // 处理超时
    if (config.timeout) {
      timer = setTimeout(function handleRequestTimeout() {
        req.abort()
        reject(createError(
          'timeout of ' + config.timeout + 'ms exceeded',
          config,
          config.transitional && config.transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
          req
        ))
      }, config.timeout)
    }

    // 发送请求数据
    if (isStream(data)) {
      data.on('error', function handleStreamError(err) {
        reject(enhanceError(err, config, null, req))
      }).pipe(req)
    } else {
      req.end(data)
    }
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

// 工具函数：检查是否为流
function isStream(val) {
  return val !== null && typeof val === 'object' && typeof val.pipe === 'function'
}

// 工具函数：检查是否为Date对象
function isDate(val) {
  return Object.prototype.toString.call(val) === '[object Date]'
}

// 工具函数：检查是否为对象
function isObject(val) {
  return val !== null && typeof val === 'object'
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

module.exports = httpAdapter
