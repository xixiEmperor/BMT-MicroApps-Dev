/**
 * 应用根组件
 * 职责：承载路由容器，渲染各业务页面，支持微前端环境
 */
import { RouterProvider } from 'react-router-dom'
import router from './router/index'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/es/locale/zh_CN'
import { Suspense, useEffect } from 'react'
import { useWujie } from '@/hooks/useWujie'

// App组件的Props类型定义
interface AppProps {
  userInfo?: {
    id: string
    username: string
    role: string
    avatar?: string
  }
  token?: string
  theme?: 'light' | 'dark'
  language?: string
}

function App(props: AppProps = {}) {
  const { isWujie, wujieProps, emitToParent, onFromParent } = useWujie()
  
  // 合并props：优先使用无界传递的props，其次使用直接传递的props
  const finalProps = isWujie ? wujieProps : props

  useEffect(() => {
    console.log('🎯 [App] 当前运行模式:', isWujie ? '微前端模式' : '独立运行模式')
    console.log('📦 [App] 接收到的Props:', finalProps)
    
    // 处理从主应用传递的用户信息
    if (finalProps.userInfo) {
      console.log('👤 [App] 收到用户信息:', finalProps.userInfo)
      // 这里可以更新全局状态管理中的用户信息
      // 例如：userStore.setUserInfo(finalProps.userInfo)
    }
    
    // 处理从主应用传递的认证token
    if (finalProps.token) {
      console.log('🔑 [App] 收到认证token')
      // 这里可以设置axios的默认header
      // 例如：axios.defaults.headers.common['Authorization'] = `Bearer ${finalProps.token}`
    }
    
    // 处理主题设置
    if (finalProps.theme) {
      console.log('🎨 [App] 收到主题设置:', finalProps.theme)
      // 这里可以应用主题
    }

    // 如果在微前端环境中，监听主应用的事件
    if (isWujie) {
      // 监听用户信息更新事件
      onFromParent('user-info-updated', (userInfo) => {
        console.log('📥 [App] 收到用户信息更新:', userInfo)
        // 更新本地用户状态
      })
      
      // 监听登出事件
      onFromParent('user-logout', () => {
        console.log('📥 [App] 收到用户登出事件')
        // 清理本地状态，可能需要重定向到登录页
      })
      
      // 监听主题切换事件
      onFromParent('theme-changed', (theme) => {
        console.log('📥 [App] 收到主题切换事件:', theme)
        // 切换应用主题
      })
    }
  }, [finalProps, isWujie])

  // 处理路由变化，通知主应用
  useEffect(() => {
    if (isWujie) {
      // 监听路由变化
      const handleRouteChange = () => {
        const currentPath = window.location.pathname
        emitToParent('route-changed', {
          path: currentPath,
          timestamp: Date.now()
        })
      }
      
      // 监听路由变化事件
      window.addEventListener('popstate', handleRouteChange)
      
      return () => {
        window.removeEventListener('popstate', handleRouteChange)
      }
    }
  }, [isWujie, emitToParent])

  return (
    <ConfigProvider locale={zhCN}>
      <Suspense fallback={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '16px',
          color: '#666'
        }}>
          正在加载管理后台...
        </div>
      }>
        <RouterProvider router={router} />
      </Suspense>
    </ConfigProvider>
  )
}

export default App
