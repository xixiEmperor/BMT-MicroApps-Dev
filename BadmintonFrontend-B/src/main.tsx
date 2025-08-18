import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import App from './App.tsx'
import './index.css'

// 声明全局类型
declare global {
  interface Window {
    __POWERED_BY_WUJIE__?: boolean
    __WUJIE_MOUNT?: () => void
    __WUJIE_UNMOUNT?: () => void
    __WUJIE?: {
      props?: any
      bus?: any
    }
  }
}

let root: any = null

// 渲染函数
function render(props: any = {}) {
  const container = document.querySelector('#root')
  if (container) {
    root = createRoot(container)
    root.render(
      <StrictMode>
        <App {...props} />
      </StrictMode>
    )
  }
}

// 卸载函数
function unmount() {
  if (root) {
    root.unmount()
    root = null
  }
}

// 判断是否在无界环境中
if (window.__POWERED_BY_WUJIE__) {
  // 在无界环境中
  window.__WUJIE_MOUNT = () => {
    const props = window.__WUJIE?.props || {}
    render(props)
  }
  
  window.__WUJIE_UNMOUNT = () => {
    unmount()
  }
} else {
  // 独立运行
  render()
}

// 监听无界Props更新
if (window.__WUJIE?.bus) {
  window.__WUJIE.bus.$on('user-info-updated', (props: any) => {
    // 可以在这里处理主应用传递的数据更新
    console.log('收到主应用数据更新:', props)
  })
}
