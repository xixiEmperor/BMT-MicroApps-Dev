/**
 * 无界微前端配置文件
 * 
 * 无界(wujie)是一个基于Web Components + iframe 的微前端解决方案
 * 主要特点：
 * 1. 框架无关：支持任意框架的子应用接入
 * 2. 样式隔离：基于shadow dom实现样式隔离
 * 3. JS隔离：基于iframe实现JS运行环境隔离
 * 4. 预加载：支持子应用预加载，提升用户体验
 * 5. 保活模式：支持子应用保活，避免重复渲染
 */

import WujieVue from 'wujie-vue3'
import { startApp } from 'wujie'

// 从WujieVue组件中解构需要的方法
const { bus, setupApp, preloadApp } = WujieVue
import { ElMessage } from 'element-plus'

// 无界全局配置对象
const wujieConfig = {
  // 子应用配置映射表
  apps: {
    // React管理后台子应用配置
    'react-admin': {
      // 开发环境地址 - React项目运行在5000端口
      devUrl: 'http://localhost:5000',
      // 生产环境地址 - 静态资源路径，将在nginx中配置
      prodUrl: '/admin-static',
      // 预加载配置 - 提前加载子应用资源，提升首次访问速度
      preload: true,
      // 保活模式 - 子应用切换时不销毁，保持状态和数据
      // 优点：切换快速，状态保持
      // 缺点：内存占用相对较高
      alive: true,
      // 路由同步 - 子应用路由变化时同步到主应用地址栏
      // 确保浏览器前进后退按钮正常工作
      sync: true,
      // 自定义fetch函数 - 用于处理子应用资源请求
      // 主要用于解决跨域问题和添加自定义请求头
      fetch: (url, options) => {
        return window.fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            // 添加CORS头，解决跨域问题
            'Access-Control-Allow-Origin': '*',
          }
        })
      },
      
      // 生命周期钩子函数 - 用于监听子应用的各个生命周期阶段
      
      // 子应用加载前钩子
      beforeLoad: (appWindow) => {
        console.log('🔄 [Wujie] 子应用开始加载:', appWindow)
        // 可以在这里做一些准备工作，如显示loading
      },
      
      // 子应用挂载前钩子
      beforeMount: (appWindow) => {
        console.log('📦 [Wujie] 子应用准备挂载:', appWindow)
        // 可以在这里向子应用传递初始数据
      },
      
      // 子应用挂载后钩子
      afterMount: (appWindow) => {
        console.log('✅ [Wujie] 子应用挂载完成:', appWindow)
        // 子应用已经可以正常使用
      },
      
      // 子应用卸载前钩子
      beforeUnmount: (appWindow) => {
        console.log('🔄 [Wujie] 子应用准备卸载:', appWindow)
        // 可以在这里保存子应用状态
      },
      
      // 子应用卸载后钩子
      afterUnmount: (appWindow) => {
        console.log('🗑️ [Wujie] 子应用已卸载:', appWindow)
        // 清理工作完成
      }
    }
  }
}

/**
 * 初始化无界微前端框架
 * 
 * 这个函数在主应用启动时调用，用于：
 * 1. 设置子应用的基本配置
 * 2. 预加载子应用资源（如果开启了预加载）
 * 3. 建立主子应用的通信通道
 */
export function initWujie() {
  try {
    // 获取React管理后台的配置
    const reactAdminConfig = wujieConfig.apps['react-admin']
    
    // 根据环境变量决定使用开发还是生产地址
    const appUrl = process.env.NODE_ENV === 'development' 
      ? reactAdminConfig.devUrl 
      : reactAdminConfig.prodUrl
    
    // 设置子应用配置
    // setupApp 用于注册子应用的全局配置
    setupApp({
      name: 'react-admin',          // 子应用唯一标识
      url: appUrl,                  // 子应用地址
      alive: reactAdminConfig.alive, // 是否保活
      ...reactAdminConfig           // 展开其他配置
    })

    // 如果开启了预加载，则预加载子应用
    // 预加载会提前下载子应用的HTML、CSS、JS资源
    // 但不会执行JS代码，只有在真正需要时才会执行
    if (reactAdminConfig.preload) {
      
      try {
        // preloadApp是同步方法，没有返回值
        preloadApp({
          name: 'react-admin',
          url: appUrl,
          // 添加预加载配置
          exec: false, // 不执行JS，只下载资源
          // 预加载错误处理
          loadError: (url, error) => {
            console.error('❌ [Wujie] 子应用预加载失败:', url, error)
            ElMessage.warning('管理后台预加载失败，可能会影响首次访问速度')
          }
        })

      } catch (error) {
        console.error('❌ [Wujie] 预加载配置失败:', error)
        ElMessage.warning('管理后台预加载配置失败')
      }
    }
    
  } catch (error) {
    console.error('❌ [Wujie] 无界框架初始化失败:', error)
    ElMessage.error('微前端框架初始化失败')
  }
}

/**
 * 启动React管理后台子应用
 * 
 * @param {HTMLElement} container - 子应用的容器DOM元素
 * @param {Object} props - 传递给子应用的数据
 * @returns {Promise} 启动子应用的Promise
 * 
 * 这个函数在用户访问管理后台页面时调用
 * 会在指定的DOM容器中渲染React子应用
 */
export function startReactAdmin(container, props = {}) {
  const reactAdminConfig = wujieConfig.apps['react-admin']
  const appUrl = process.env.NODE_ENV === 'development' 
    ? reactAdminConfig.devUrl 
    : reactAdminConfig.prodUrl
  
  return startApp({
    name: 'react-admin',    // 子应用名称，必须与setupApp中的name一致
    url: appUrl,           // 子应用地址
    el: container,         // 子应用渲染的容器元素
    props,                 // 传递给子应用的数据，子应用可以通过window.__WUJIE.props访问
    alive: true,           // 启用保活模式
    sync: true             // 启用路由同步
  })
}

/**
 * 导出无界事件总线
 * 
 * bus是无界提供的事件总线，用于主子应用间的通信
 * 主要方法：
 * - bus.$emit(event, data) - 发送事件
 * - bus.$on(event, callback) - 监听事件
 * - bus.$off(event, callback) - 取消监听
 * 
 * 使用示例：
 * 主应用发送数据：bus.$emit('user-info-updated', userInfo)
 * 子应用监听数据：bus.$on('user-info-updated', (userInfo) => {...})
 */
export { bus }

/**
 * 导出配置对象，供其他模块使用
 */
export { wujieConfig }