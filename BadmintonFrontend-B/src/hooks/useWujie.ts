/**
 * 无界微前端适配 Hook
 * 
 * 这个Hook用于：
 * 1. 检测当前应用是否运行在无界微前端环境中
 * 2. 获取主应用传递的props数据
 * 3. 提供主子应用通信的方法
 */

import { useState, useEffect } from 'react'

// 无界环境检测类型
interface WujieWindow extends Window {
  __POWERED_BY_WUJIE__?: boolean
  __WUJIE?: {
    props?: any
    bus?: {
      $emit: (event: string, data?: any) => void
      $on: (event: string, callback: (data?: any) => void) => void
      $off: (event: string, callback?: (data?: any) => void) => void
    }
  }
  $wujie?: {
    props?: any
    bus?: any
  }
}

// Hook返回值类型定义
interface UseWujieReturn {
  isWujie: boolean           // 是否在无界环境中运行
  wujieProps: any            // 主应用传递的props
  emitToParent: (event: string, data?: any) => void    // 向主应用发送事件
  onFromParent: (event: string, callback: (data?: any) => void) => void  // 监听主应用事件
  offFromParent: (event: string, callback?: (data?: any) => void) => void // 取消监听主应用事件
}

/**
 * 无界微前端适配Hook
 */
export function useWujie(): UseWujieReturn {
  const [isWujie, setIsWujie] = useState(false)
  const [wujieProps, setWujieProps] = useState({})

  useEffect(() => {
    const wujieWindow = window as WujieWindow
    
    // 检测是否在无界环境中
    const isInWujie = !!(
      wujieWindow.__POWERED_BY_WUJIE__ || 
      wujieWindow.__WUJIE || 
      wujieWindow.$wujie
    )
    
    setIsWujie(isInWujie)
    
    if (isInWujie) {
      console.log('🎯 [BadmintonFrontend-B] 检测到无界微前端环境')
      
      // 获取主应用传递的props
      const props = wujieWindow.__WUJIE?.props || 
                   wujieWindow.$wujie?.props || 
                   {}
      
      setWujieProps(props)
      console.log('📦 [BadmintonFrontend-B] 收到主应用props:', props)
      
      // 向主应用发送子应用准备就绪的消息
      const bus = wujieWindow.__WUJIE?.bus || wujieWindow.$wujie?.bus
      if (bus && bus.$emit) {
        bus.$emit('child-app-ready', {
          appName: 'react-admin',
          message: 'BadmintonFrontend-B 子应用已准备就绪',
          timestamp: Date.now()
        })
      }
    } else {
      console.log('🏠 [BadmintonFrontend-B] 独立运行模式')
    }
  }, [])

  // 向主应用发送事件
  const emitToParent = (event: string, data?: any) => {
    if (!isWujie) {
      console.warn('⚠️ [BadmintonFrontend-B] 非无界环境，无法向主应用发送事件')
      return
    }
    
    const wujieWindow = window as WujieWindow
    const bus = wujieWindow.__WUJIE?.bus || wujieWindow.$wujie?.bus
    
    if (bus && bus.$emit) {
      console.log(`📤 [BadmintonFrontend-B] 向主应用发送事件: ${event}`, data)
      bus.$emit(event, data)
    } else {
      console.error('❌ [BadmintonFrontend-B] 无法获取事件总线')
    }
  }

  // 监听主应用事件
  const onFromParent = (event: string, callback: (data?: any) => void) => {
    if (!isWujie) {
      console.warn('⚠️ [BadmintonFrontend-B] 非无界环境，无法监听主应用事件')
      return
    }
    
    const wujieWindow = window as WujieWindow
    const bus = wujieWindow.__WUJIE?.bus || wujieWindow.$wujie?.bus
    
    if (bus && bus.$on) {
      console.log(`📥 [BadmintonFrontend-B] 开始监听主应用事件: ${event}`)
      bus.$on(event, callback)
    } else {
      console.error('❌ [BadmintonFrontend-B] 无法获取事件总线')
    }
  }

  // 取消监听主应用事件
  const offFromParent = (event: string, callback?: (data?: any) => void) => {
    if (!isWujie) {
      return
    }
    
    const wujieWindow = window as WujieWindow
    const bus = wujieWindow.__WUJIE?.bus || wujieWindow.$wujie?.bus
    
    if (bus && bus.$off) {
      console.log(`🔇 [BadmintonFrontend-B] 取消监听主应用事件: ${event}`)
      bus.$off(event, callback)
    }
  }

  return {
    isWujie,
    wujieProps,
    emitToParent,
    onFromParent,
    offFromParent
  }
}

export default useWujie