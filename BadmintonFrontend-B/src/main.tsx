/**
 * 应用入口
 * - 注入 React Query、AntD 主题与 CSS-in-JS Provider
 * - 挂载根组件 `App`
 * - 支持微前端环境和独立运行
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 引入 Ant Design v5 样式重置，确保 Modal 等组件样式与层级正常
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StyleProvider } from '@ant-design/cssinjs'

// 扩展Window接口以支持无界微前端
declare global {
  interface Window {
    __POWERED_BY_WUJIE__?: boolean
    __WUJIE?: any
    $wujie?: any
  }
}

const queryClient = new QueryClient()

/**
 * 渲染应用的函数
 * @param container 容器元素，可以是document.getElementById('root')或无界传递的容器
 * @param props 传递给App组件的props
 */
function renderApp(container: HTMLElement | null, props = {}) {
  if (!container) {
    console.error('❌ [main.tsx] 无法找到容器元素')
    return
  }

  console.log('🚀 [main.tsx] 开始渲染应用')
  console.log('📦 [main.tsx] 传递的props:', props)

  const root = createRoot(container)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <StyleProvider hashPriority="high">
          <App {...props} />
        </StyleProvider>
      </QueryClientProvider>
    </StrictMode>
  )

  return root
}

// 检测运行环境
const isWujieEnvironment = window.__POWERED_BY_WUJIE__ || window.__WUJIE || window.$wujie

if (isWujieEnvironment) {
  // 微前端环境：不立即渲染，等待无界框架调用
  console.log('🎯 [main.tsx] 检测到无界微前端环境，等待框架调用')
  
  // 将渲染函数暴露给全局，供无界框架调用
  if (window.__WUJIE) {
    window.__WUJIE.mount = renderApp
  } else if (window.$wujie) {
    window.$wujie.mount = renderApp
  }
  
  // 也可以暴露到全局变量，增加兼容性
  (window as any).renderBadmintonAdmin = renderApp
} else {
  // 独立运行环境：直接渲染
  console.log('🏠 [main.tsx] 独立运行模式，直接渲染应用')
  const container = document.getElementById('root')
  renderApp(container)
}

// 导出渲染函数，供其他地方使用
export { renderApp }
