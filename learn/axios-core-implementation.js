/**
 * Axios 核心实现源码学习
 * 这里展示了axios底层是如何实现HTTP请求的核心机制
 */

// 1. Axios 构造函数和核心类
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager()
    }
  }

  // 核心请求方法
  request(configOrUrl, config) {
    // 处理参数重载 axios(url, config) 或 axios(config)
    if (typeof configOrUrl === 'string') {
      config = config || {}
      config.url = configOrUrl
    } else {
      config = configOrUrl || {}
    }

    // 合并配置
    config = mergeConfig(this.defaults, config)

    // 设置请求方法，默认为GET
    config.method = (config.method || 'get').toLowerCase()

    // 构建拦截器链
    const chain = [dispatchRequest, undefined]
    let promise = Promise.resolve(config)

    // 添加请求拦截器到链的前面
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      chain.unshift(interceptor.fulfilled, interceptor.rejected)
    })

    // 添加响应拦截器到链的后面
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      chain.push(interceptor.fulfilled, interceptor.rejected)
    })

    // 执行拦截器链
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift())
    }

    return promise
  }

  // HTTP方法的便捷方法
  get(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: 'get',
      url: url
    }))
  }

  delete(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: 'delete',
      url: url
    }))
  }

  head(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: 'head',
      url: url
    }))
  }

  options(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: 'options',
      url: url
    }))
  }

  post(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: 'post',
      url: url,
      data: data
    }))
  }

  put(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: 'put',
      url: url,
      data: data
    }))
  }

  patch(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: 'patch',
      url: url,
      data: data
    }))
  }
}

// 2. 拦截器管理器
class InterceptorManager {
  constructor() {
    this.handlers = []
  }

  // 添加拦截器
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled: fulfilled,
      rejected: rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    })
    return this.handlers.length - 1
  }

  // 移除拦截器
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null
    }
  }

  // 遍历拦截器
  forEach(fn) {
    this.handlers.forEach(function forEachHandler(h) {
      if (h !== null) {
        fn(h)
      }
    })
  }
}

// 3. 核心请求分发函数
function dispatchRequest(config) {
  // 取消请求的处理
  throwIfCancellationRequested(config)

  // 确保headers存在
  config.headers = config.headers || {}

  // 转换请求数据
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  )

  // 扁平化headers
  config.headers = flattenHeaders(config.headers, config.method)

  // 选择适配器（浏览器用xhr，Node.js用http）
  const adapter = config.adapter || getDefaultAdapter()

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config)

    // 转换响应数据
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    )

    return response
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config)

      // 转换响应数据
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        )
      }
    }

    return Promise.reject(reason)
  })
}

// 4. 获取默认适配器
function getDefaultAdapter() {
  let adapter
  if (typeof XMLHttpRequest !== 'undefined') {
    // 浏览器环境，使用xhr适配器
    adapter = require('./adapters/xhr')
  } else if (typeof process !== 'undefined' &&
             Object.prototype.toString.call(process) === '[object process]') {
    // Node.js环境，使用http适配器
    adapter = require('./adapters/http')
  }
  return adapter
}

// 5. 工具函数
function mergeConfig(config1, config2) {
  config2 = config2 || {}
  const config = {}

  // 需要深拷贝的属性
  const valueFromConfig2Keys = ['url', 'method', 'data']
  const mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy', 'params']
  const defaultToConfig2Keys = [
    'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
    'timeout', 'timeoutMessage', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
    'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'decompress',
    'maxContentLength', 'maxBodyLength', 'maxRedirects', 'transport', 'httpAgent',
    'httpsAgent', 'cancelToken', 'socketPath', 'responseEncoding'
  ]
  const directMergeKeys = ['validateStatus']

  function getMergedValue(target, source) {
    if (isPlainObject(target) && isPlainObject(source)) {
      return merge(target, source)
    } else if (isPlainObject(source)) {
      return merge({}, source)
    } else if (isArray(source)) {
      return source.slice()
    }
    return source
  }

  // 处理不同类型的配置合并
  valueFromConfig2Keys.forEach(function valueFromConfig2(prop) {
    if (config2[prop] !== undefined) {
      config[prop] = getMergedValue(undefined, config2[prop])
    }
  })

  mergeDeepPropertiesKeys.forEach(function mergeDeepProperties(prop) {
    if (isPlainObject(config2[prop])) {
      config[prop] = getMergedValue(config1[prop], config2[prop])
    } else if (config2[prop] !== undefined) {
      config[prop] = getMergedValue(undefined, config2[prop])
    } else if (isPlainObject(config1[prop])) {
      config[prop] = getMergedValue(undefined, config1[prop])
    }
  })

  defaultToConfig2Keys.forEach(function defaultToConfig2(prop) {
    if (config2[prop] !== undefined) {
      config[prop] = getMergedValue(undefined, config2[prop])
    } else if (config1[prop] !== undefined) {
      config[prop] = getMergedValue(undefined, config1[prop])
    }
  })

  directMergeKeys.forEach(function merge(prop) {
    if (config2[prop] !== undefined) {
      config[prop] = config2[prop]
    } else if (config1[prop] !== undefined) {
      config[prop] = config1[prop]
    }
  })

  return config
}

// 数据转换函数
function transformData(data, headers, fns) {
  const context = this || {}
  fns.forEach(function transform(fn) {
    data = fn.call(context, data, headers)
  })
  return data
}

// 检查是否为普通对象
function isPlainObject(val) {
  return Object.prototype.toString.call(val) === '[object Object]'
}

// 检查是否为数组
function isArray(val) {
  return Array.isArray(val)
}

// 对象合并
function merge(/* obj1, obj2, obj3, ... */) {
  const result = {}
  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val)
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val)
    } else if (isArray(val)) {
      result[key] = val.slice()
    } else {
      result[key] = val
    }
  }

  for (let i = 0, l = arguments.length; i < l; i++) {
    Object.keys(arguments[i]).forEach(function(key) {
      assignValue(arguments[i][key], key)
    })
  }
  return result
}

// 扁平化headers
function flattenHeaders(headers, method) {
  headers = headers || {}
  const context = {}

  // 合并通用headers、方法特定headers和实例headers
  const methodsToMerge = ['common', method].concat(['delete', 'get', 'head', 'post', 'put', 'patch'])

  methodsToMerge.forEach(function(method) {
    if (headers[method]) {
      Object.assign(context, headers[method])
      delete headers[method]
    }
  })

  return Object.assign(context, headers)
}

// 取消请求相关
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested()
  }
  if (config.signal && config.signal.aborted) {
    throw new Cancel('Request aborted')
  }
}

function isCancel(value) {
  return !!(value && value.__CANCEL__)
}

class Cancel {
  constructor(message) {
    this.message = message
    this.__CANCEL__ = true
  }

  toString() {
    return 'Cancel' + (this.message ? ': ' + this.message : '')
  }
}

// 6. 创建axios实例的工厂函数
function createInstance(defaultConfig) {
  const context = new Axios(defaultConfig)

  // 将Axios.prototype.request绑定到context
  const instance = Axios.prototype.request.bind(context)

  // 复制axios.prototype到instance
  Object.keys(Axios.prototype).forEach(function(key) {
    instance[key] = Axios.prototype[key].bind(context)
  })

  // 复制context到instance
  Object.keys(context).forEach(function(key) {
    instance[key] = context[key]
  })

  return instance
}

// 7. 默认配置
const defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    // 处理请求数据转换
    if (data && typeof data === 'object' && !(data instanceof FormData)) {
      headers['Content-Type'] = 'application/json;charset=utf-8'
      return JSON.stringify(data)
    }
    return data
  }],

  transformResponse: [function transformResponse(data) {
    // 处理响应数据转换
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch {
        // 忽略解析错误
      }
    }
    return data
  }],

  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    }
  }
}

// 设置不同HTTP方法的默认headers
const methodsNoData = ['delete', 'get', 'head', 'options']
const methodsWithData = ['post', 'put', 'patch']

methodsNoData.forEach(function(method) {
  defaults.headers[method] = {}
})

methodsWithData.forEach(function(method) {
  defaults.headers[method] = {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})

// 8. 创建默认实例
const axios = createInstance(defaults)

// 暴露Axios类以供创建新实例
axios.Axios = Axios
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(defaults, instanceConfig))
}

// 暴露Cancel相关
axios.Cancel = Cancel
axios.CancelToken = CancelToken
axios.isCancel = isCancel

export default axios
