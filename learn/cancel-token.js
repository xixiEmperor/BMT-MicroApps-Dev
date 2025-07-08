/**
 * Axios 取消请求功能源码学习
 * 展示axios如何实现请求取消机制
 */

// Cancel类 - 表示取消操作
class Cancel {
  constructor(message) {
    this.message = message
    this.__CANCEL__ = true // 用于标识这是一个取消对象
  }

  toString() {
    return 'Cancel' + (this.message ? ': ' + this.message : '')
  }
}

// CancelToken类 - 取消令牌
class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.')
    }

    let resolvePromise

    // 创建一个Promise，当取消时会被resolve
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve
    })

    const token = this

    // 给executor传入cancel函数
    executor(function cancel(message) {
      if (token.reason) {
        // 已经被取消了，直接返回
        return
      }

      token.reason = new Cancel(message)
      resolvePromise(token.reason)
    })
  }

  /**
   * 如果请求已被取消，则抛出Cancel对象
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason
    }
  }

  /**
   * 静态方法：创建CancelToken的便捷方法
   * 返回一个对象，包含token和cancel函数
   */
  static source() {
    let cancel
    const token = new CancelToken(function executor(c) {
      cancel = c
    })

    return {
      token: token,
      cancel: cancel
    }
  }
}

// 工具函数：检查值是否为Cancel对象
function isCancel(value) {
  return !!(value && value.__CANCEL__)
}

// 在请求拦截器中使用取消令牌的示例
function setupCancelTokenInterceptor(axiosInstance) {
  // 请求拦截器中检查取消状态
  axiosInstance.interceptors.request.use(function(config) {
    // 检查是否已被取消
    if (config.cancelToken) {
      config.cancelToken.throwIfRequested()
    }

    return config
  }, function(error) {
    return Promise.reject(error)
  })

  // 响应拦截器中也要检查
  axiosInstance.interceptors.response.use(function(response) {
    return response
  }, function(error) {
    if (isCancel(error)) {
      console.log('请求被取消:', error.message)
    }
    return Promise.reject(error)
  })
}

// 在适配器中处理取消的示例（XHR适配器）
function handleCancelInXHRAdapter(config, request) {
  if (config.cancelToken) {
    // 监听取消事件
    config.cancelToken.promise.then(function onCanceled(cancel) {
      if (!request) {
        return
      }

      // 取消XMLHttpRequest
      request.abort()

      // 清理request引用
      request = null
    })
  }

  // 如果配置了AbortController (现代浏览器)
  if (config.signal) {
    if (config.signal.aborted) {
      request.abort()
    } else {
      config.signal.addEventListener('abort', function() {
        request.abort()
      })
    }
  }
}

// 在适配器中处理取消的示例（HTTP适配器 - Node.js）
function handleCancelInHTTPAdapter(config, request) {
  if (config.cancelToken) {
    // 监听取消事件
    config.cancelToken.promise.then(function onCanceled(cancel) {
      if (!request) {
        return
      }

      // 取消HTTP请求
      request.abort()

      // 清理request引用
      request = null
    })
  }
}

// 使用示例
const usageExamples = {
  // 示例1：基本用法
  basicUsage() {
    const CancelToken = axios.CancelToken
    const source = CancelToken.source()

    axios.get('/user/12345', {
      cancelToken: source.token
    }).catch(function(thrown) {
      if (axios.isCancel(thrown)) {
        console.log('请求被取消', thrown.message)
      } else {
        // 处理其他错误
      }
    })

    // 取消请求（message参数是可选的）
    source.cancel('用户取消了操作')
  },

  // 示例2：使用executor函数
  executorUsage() {
    const CancelToken = axios.CancelToken
    let cancel

    axios.get('/user/12345', {
      cancelToken: new CancelToken(function executor(c) {
        // executor函数接收一个cancel函数作为参数
        cancel = c
      })
    })

    // 取消请求
    cancel('用户取消了操作')
  },

  // 示例3：在组件中使用（React示例）
  reactComponentUsage() {
    class MyComponent extends React.Component {
      constructor(props) {
        super(props)
        this.source = axios.CancelToken.source()
      }

      componentDidMount() {
        axios.get('/api/data', {
          cancelToken: this.source.token
        }).then(response => {
          this.setState({ data: response.data })
        }).catch(error => {
          if (axios.isCancel(error)) {
            console.log('请求被取消')
          } else {
            console.error('请求失败:', error)
          }
        })
      }

      componentWillUnmount() {
        // 组件卸载时取消请求
        this.source.cancel('组件已卸载')
      }

      render() {
        return <div>My Component</div>
      }
    }
  },

  // 示例4：取消多个请求
  cancelMultipleRequests() {
    const CancelToken = axios.CancelToken
    const source = CancelToken.source()

    // 使用同一个cancelToken发起多个请求
    const request1 = axios.get('/api/data1', { cancelToken: source.token })
    const request2 = axios.get('/api/data2', { cancelToken: source.token })
    const request3 = axios.post('/api/data3', { data: 'test' }, { cancelToken: source.token })

    // 一次性取消所有请求
    source.cancel('批量取消请求')
  },

  // 示例5：条件取消
  conditionalCancel() {
    const CancelToken = axios.CancelToken
    let cancel

    const request = axios.get('/api/slow-endpoint', {
      cancelToken: new CancelToken(function executor(c) {
        cancel = c
      })
    })

    // 5秒后如果还没完成就取消
    setTimeout(() => {
      cancel('请求超时，主动取消')
    }, 5000)

    return request
  }
}

// 取消令牌的内部实现细节
const internalImplementation = {
  // 在dispatchRequest中检查取消状态
  checkCancellationInDispatchRequest(config) {
    // 在发送请求前检查
    if (config.cancelToken) {
      config.cancelToken.throwIfRequested()
    }

    // 在适配器返回后再次检查
    return adapter(config).then(function onAdapterResolution(response) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested()
      }
      return response
    }, function onAdapterRejection(reason) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested()
      }
      return Promise.reject(reason)
    })
  },

  // 在拦截器链中传播取消状态
  propagateCancellationInInterceptorChain() {
    // 这是axios内部处理取消的伪代码
    function executeInterceptorChain(config) {
      let promise = Promise.resolve(config)

      // 在每个拦截器执行前检查取消状态
      interceptors.forEach(function(interceptor) {
        promise = promise.then(function(config) {
          if (config.cancelToken) {
            config.cancelToken.throwIfRequested()
          }
          return interceptor.fulfilled(config)
        }, interceptor.rejected)
      })

      return promise
    }
  }
}

// 导出
export {
  Cancel,
  CancelToken,
  isCancel,
  setupCancelTokenInterceptor,
  handleCancelInXHRAdapter,
  handleCancelInHTTPAdapter,
  usageExamples,
  internalImplementation
}
