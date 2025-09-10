<template>
  <div class="admin-container">
    <!-- 加载状态显示区域，当子应用还在加载时显示，提升用户体验-->
    <div v-if="loading" class="loading-container">
      <!-- Element Plus的加载动画组件 -->
      <el-icon class="loading-icon" :size="40">
        <Loading />
      </el-icon>
      <p class="loading-text">正在加载管理后台...</p>
      <p class="loading-tip">首次加载可能需要几秒钟，请耐心等待</p>
    </div>
    
    <!-- 
      错误状态显示区域
      当子应用加载失败时显示
    -->
    <div v-if="error" class="error-container">
      <el-icon class="error-icon" :size="40">
        <Warning />
      </el-icon>
      <p class="error-text">管理后台加载失败</p>
      <p class="error-message">{{ errorMessage }}</p>
      <el-button type="primary" @click="retryLoad">重新加载</el-button>
    </div>
    
    <!-- 
      子应用容器
      使用命令式API直接挂载React子应用
    -->
    <div 
      v-show="!loading && !error"
      ref="subAppContainer"
      id="react-admin-container"
      class="sub-app-container"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores'
import { Loading, Warning } from '@element-plus/icons-vue'
import { bus, startReactAdmin } from '@/utils/wujie'

/**
 * 组件状态管理
 */
const userStore = useUserStore() // 用户状态管理store
const loading = ref(true)        // 加载状态
const error = ref(false)         // 错误状态
const errorMessage = ref('')     // 错误信息
const subAppContainer = ref(null) // 子应用容器引用

/**
 * 传递给子应用的数据
 * 这些数据会通过无界框架传递给React子应用
 * React子应用可以通过 window.__WUJIE.props 访问这些数据
 */
const adminProps = computed(() => {
  const props = {
    // 用户基本信息
    userInfo: userStore.userinfo,
    // 认证token，用于API请求
    token: userStore.token,
    // 主题配置（预留，可用于主子应用主题同步）
    theme: 'light',
    // 语言配置（预留，可用于国际化）
    language: 'zh-CN',
    // 时间戳，用于检测数据更新
    timestamp: Date.now()
  }
  return props
})

/**
 * 启动子应用的核心函数
 */
const startSubApp = async () => {
  try {
    // 确保容器元素存在
    if (!subAppContainer.value) {
      throw new Error('子应用容器元素不存在')
    }
    
    // 使用命令式API启动子应用
    await startReactAdmin(subAppContainer.value, adminProps.value)
    
    // 启动成功
    loading.value = false
    error.value = false
    
    // 向子应用发送初始数据
    setTimeout(() => {
      bus.$emit('user-info-updated', adminProps.value)
    }, 500)
    
  } catch (err) {
    handleError(err)
  }
}

// 子应用加载错误
const handleError = (errorInfo) => {
  loading.value = false
  error.value = true
  
  // 提取错误信息
  const message = errorInfo?.message || errorInfo?.toString() || '未知错误'
  errorMessage.value = message
  
  // 用户友好的错误提示
  if (message.includes('Failed to fetch')) {
    errorMessage.value = '网络连接失败，请检查网络状态或稍后重试'
  } else if (message.includes('404')) {
    errorMessage.value = '管理后台服务未启动，请联系管理员'
  } else {
    errorMessage.value = `加载失败: ${message}`
  }
  
  ElMessage.error('管理后台加载失败，请刷新重试')
}

/**
 * 重新加载子应用
 */
const retryLoad = async () => {
  error.value = false
  loading.value = true
  
  // 直接调用启动函数
  await startSubApp()
}

/**
 * 监听用户信息变化，实时同步到子应用
 */
const handleUserInfoChange = () => {
  if (!loading.value && !error.value) {
    bus.$emit('user-info-updated', adminProps.value)
  }
}

/**
 * 组件挂载时的初始化逻辑
 */
onMounted(() => {
  // 监听用户信息变化
  // 当用户信息在主应用中发生变化时，自动同步到子应用
  userStore.$subscribe(handleUserInfoChange)
  
  // 等待DOM渲染完成后启动子应用
  setTimeout(async () => {
    await startSubApp()
  }, 100)
  
  /**
   * 监听子应用发送的消息
   * 建立主子应用的双向通信
   */
  
  // 处理子应用的退出登录请求
  bus.$on('admin-logout', () => {
    
    ElMessageBox.confirm(
      '您确定要退出登录吗？',
      '确认退出',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(() => {
      userStore.logout()
      ElMessage.success('已退出登录')
      // 跳转到登录页
      window.location.href = '/login'
    }).catch(() => {
    })
  })
  
  // 处理子应用的导航请求
  bus.$on('admin-navigate', (path) => {
    console.log('📨 [AdminContainer] 收到子应用导航请求:', path)
    // 这里可以处理子应用请求导航到主应用的某个页面
    // 例如：router.push(path)
  })
  
  // 处理子应用发送的用户信息更新
  bus.$on('admin-user-updated', (userData) => {
    // 子应用更新了用户信息，同步到主应用
    userStore.updateUserInfo(userData)
  })
  
  // 处理子应用的通知消息
  bus.$on('admin-message', ({ type, message }) => {
    // 显示子应用发送的消息
    if (type === 'success') {
      ElMessage.success(message)
    } else if (type === 'error') {
      ElMessage.error(message)
    } else if (type === 'warning') {
      ElMessage.warning(message)
    } else {
      ElMessage.info(message)
    }
  })
})

/**
 * 组件卸载时的清理逻辑
 */
onUnmounted(() => {
  // 清理事件监听，防止内存泄漏
  bus.$off('admin-logout')
  bus.$off('admin-navigate')
  bus.$off('admin-user-updated')
  bus.$off('admin-message')
})
</script>

<style scoped>
/**
 * 管理后台容器样式
 */
.admin-container {
  width: 100%;
  height: 100vh;
  position: relative;
  background-color: #f5f5f5;
  overflow: auto;
}

/**
 * 子应用容器样式
 */
.sub-app-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: auto;
}

/**
 * 加载状态样式
 */
.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.loading-icon {
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
  color: #ffffff;
}

.loading-text {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 10px 0;
  color: #ffffff;
}

.loading-tip {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

/**
 * 错误状态样式
 */
.error-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #fafafa;
  color: #666;
}

.error-icon {
  color: #f56c6c;
  margin-bottom: 20px;
}

.error-text {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 10px 0;
  color: #333;
}

.error-message {
  font-size: 14px;
  color: #999;
  margin: 0 0 20px 0;
  text-align: center;
  max-width: 400px;
  line-height: 1.5;
}

/**
 * 动画效果
 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/**
 * 响应式设计
 */
@media (max-width: 768px) {
  .loading-text {
    font-size: 16px;
  }
  
  .loading-tip {
    font-size: 12px;
  }
  
  .error-text {
    font-size: 16px;
  }
  
  .error-message {
    font-size: 12px;
    max-width: 300px;
  }
}
</style>