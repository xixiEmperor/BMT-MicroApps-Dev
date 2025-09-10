# 🚀 BMT-MicroApps 三应用微前端架构改造方案

## 📋 项目现状分析

### 当前架构
```
BMT-MicroApps/
├── src/                    # Vue3 C端应用 (主应用)
├── BadmintonFrontend-B/    # React B端应用 (子应用)
├── docs/                   # 文档
└── 外部依赖: ../BMT-Central-SDK/  # 自研SDK (保持外部)
```

### 技术栈
- **C端 (Vue3)**: Element Plus + Pinia + Vite + 无界微前端
- **B端 (React)**: Ant Design + Zustand + Vite
- **外部依赖**: 自研SDK (@wfynbzlx666/sdk-*)、实时连接、监控埋点

## 🎯 目标架构设计

### 新架构：父应用 + 双子应用
```
父应用 (Vue3) - 路由分发 + 微前端容器
├── /c-app/* → C端子应用 (Vue3)
├── /admin/* → B端子应用 (React)
└── 共享: 配置、组件、hooks
```

### Monorepo 目录结构
```
BMT-MicroApps-Monorepo/
├── apps/                           # 应用层
│   ├── shell-app/                  # Vue3 父应用 (微前端容器)
│   │   ├── src/
│   │   │   ├── layouts/            # 布局组件
│   │   │   ├── router/             # 路由配置
│   │   │   └── microfrontend/      # 微前端配置
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   ├── c-app/                      # Vue3 C端子应用
│   │   ├── src/
│   │   │   ├── views/              # C端页面
│   │   │   ├── components/         # C端组件
│   │   │   └── stores/             # C端状态管理
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   └── admin-app/                  # React B端子应用
│       ├── src/
│       │   ├── pages/              # B端页面
│       │   ├── components/         # B端组件
│       │   └── stores/             # B端状态管理
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── packages/                       # 共享包层
│   ├── shared-config/              # 统一配置包
│   │   ├── eslint/                 # ESLint 配置
│   │   ├── typescript/             # TypeScript 配置
│   │   ├── vite/                   # Vite 配置
│   │   └── prettier/               # Prettier 配置
│   ├── shared-types/               # 共享类型定义
│   │   ├── api.ts                  # API 类型
│   │   ├── user.ts                 # 用户类型
│   │   └── common.ts               # 通用类型
│   ├── shared-hooks/               # 共享 hooks
│   │   ├── vue/                    # Vue hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useRequest.ts
│   │   │   └── useRealtime.ts
│   │   └── react/                  # React hooks
│   │       ├── useAuth.ts
│   │       ├── useRequest.ts
│   │       └── useRealtime.ts
│   ├── shared-components/          # 共享组件库
│   │   ├── vue/                    # Vue 组件
│   │   │   ├── BaseButton/
│   │   │   ├── BaseModal/
│   │   │   └── LoadingSpinner/
│   │   └── react/                  # React 组件
│   │       ├── BaseButton/
│   │       ├── BaseModal/
│   │       └── LoadingSpinner/
│   └── shared-utils/               # 共享工具库
│       ├── request.ts              # 请求工具
│       ├── format.ts               # 格式化工具
│       ├── constants.ts            # 常量定义
│       └── validation.ts           # 验证工具
│
├── package.json                    # 根 package.json
├── pnpm-workspace.yaml            # pnpm workspace 配置
├── turbo.json                     # Turborepo 配置
├── tsconfig.json                  # 根 TypeScript 配置
├── eslint.config.js               # 根 ESLint 配置
└── prettier.config.js             # 根 Prettier 配置
```

## 🔧 共享资源设计

### 1. 共享 Hooks 设计

#### Vue Hooks (`packages/shared-hooks/vue/`)
```typescript
// useAuth.ts - 认证相关
import { ref, computed } from 'vue'
import type { User } from '@shared/types'

export function useAuth() {
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => !!user.value)
  
  const login = async (credentials: LoginCredentials) => {
    // 登录逻辑
  }
  
  const logout = () => {
    user.value = null
  }
  
  return {
    user: readonly(user),
    isLoggedIn,
    login,
    logout
  }
}

// useRequest.ts - 请求相关
import { ref } from 'vue'

export function useRequest<T = any>() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const data = ref<T | null>(null)
  
  const execute = async (requestFn: () => Promise<T>) => {
    loading.value = true
    error.value = null
    try {
      data.value = await requestFn()
      return data.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  return {
    loading: readonly(loading),
    error: readonly(error),
    data: readonly(data),
    execute
  }
}
```

#### React Hooks (`packages/shared-hooks/react/`)
```typescript
// useAuth.ts - 认证相关
import { useState, useCallback } from 'react'
import type { User } from '@shared/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const isLoggedIn = !!user
  
  const login = useCallback(async (credentials: LoginCredentials) => {
    // 登录逻辑
  }, [])
  
  const logout = useCallback(() => {
    setUser(null)
  }, [])
  
  return {
    user,
    isLoggedIn,
    login,
    logout
  }
}

// useRequest.ts - 请求相关  
import { useState, useCallback } from 'react'

export function useRequest<T = any>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<T | null>(null)
  
  const execute = useCallback(async (requestFn: () => Promise<T>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await requestFn()
      setData(result)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  return {
    loading,
    error,
    data,
    execute
  }
}
```

### 2. 共享组件设计

#### Vue 组件 (`packages/shared-components/vue/`)
```vue
<!-- BaseButton/index.vue -->
<template>
  <button 
    :class="buttonClass" 
    :disabled="loading || disabled"
    @click="handleClick"
  >
    <LoadingSpinner v-if="loading" size="sm" />
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LoadingSpinner from '../LoadingSpinner/index.vue'

interface Props {
  type?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 'md',
  loading: false,
  disabled: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClass = computed(() => {
  const baseClass = 'btn'
  const typeClass = `btn-${props.type}`
  const sizeClass = `btn-${props.size}`
  return [baseClass, typeClass, sizeClass].join(' ')
})

const handleClick = (event: MouseEvent) => {
  if (!props.loading && !props.disabled) {
    emit('click', event)
  }
}
</script>
```

#### React 组件 (`packages/shared-components/react/`)
```tsx
// BaseButton/index.tsx
import React from 'react'
import LoadingSpinner from '../LoadingSpinner'

interface BaseButtonProps {
  type?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
  onClick?: (event: React.MouseEvent) => void
}

export const BaseButton: React.FC<BaseButtonProps> = ({
  type = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  onClick
}) => {
  const buttonClass = `btn btn-${type} btn-${size}`
  
  const handleClick = (event: React.MouseEvent) => {
    if (!loading && !disabled && onClick) {
      onClick(event)
    }
  }
  
  return (
    <button 
      className={buttonClass}
      disabled={loading || disabled}
      onClick={handleClick}
    >
      {loading ? <LoadingSpinner size="sm" /> : children}
    </button>
  )
}
```

### 3. 统一配置方案

#### `pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

#### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {}
  }
}
```

#### 根 `package.json`
```json
{
  "name": "bmt-microapps-monorepo",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "dev:shell": "turbo run dev --filter=shell-app",
    "dev:c-app": "turbo run dev --filter=c-app", 
    "dev:admin": "turbo run dev --filter=admin-app",
    "dev:all": "concurrently \"pnpm dev:shell\" \"pnpm dev:c-app\" \"pnpm dev:admin\""
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "concurrently": "^8.2.0"
  }
}
```

## 🌐 微前端集成方案

### 1. 父应用 (shell-app) 设计

#### 路由配置 (`apps/shell-app/src/router/index.ts`)
```typescript
import { createRouter, createWebHistory } from 'vue-router'
import { startApp } from 'wujie'

const routes = [
  {
    path: '/',
    redirect: '/c-app'
  },
  {
    path: '/c-app/:pathMatch(.*)*',
    name: 'c-app',
    component: () => import('@/views/MicroAppContainer.vue'),
    meta: {
      microApp: 'c-app'
    }
  },
  {
    path: '/admin/:pathMatch(.*)*',
    name: 'admin-app',
    component: () => import('@/views/MicroAppContainer.vue'),
    meta: {
      microApp: 'admin-app'
    }
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
```

#### 微前端容器组件 (`apps/shell-app/src/views/MicroAppContainer.vue`)
```vue
<template>
  <div class="micro-app-container">
    <!-- 顶部导航栏 -->
    <AppHeader :current-app="currentApp" @switch-app="handleSwitchApp" />
    
    <!-- 微前端容器 -->
    <div ref="containerRef" class="micro-app-content"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { startApp, bus } from 'wujie'
import AppHeader from '@/components/AppHeader.vue'
import { useSharedStore } from '@/stores/shared'

const route = useRoute()
const containerRef = ref<HTMLElement>()
const sharedStore = useSharedStore()

const currentApp = computed(() => route.meta?.microApp as string)

// 微前端应用配置
const microAppConfig = {
  'c-app': {
    name: 'c-app',
    url: 'http://localhost:3001',
    props: {
      userInfo: sharedStore.userInfo,
      theme: sharedStore.theme,
      sharedConfig: sharedStore.config
    }
  },
  'admin-app': {
    name: 'admin-app', 
    url: 'http://localhost:3002',
    props: {
      userInfo: sharedStore.userInfo,
      theme: sharedStore.theme,
      sharedConfig: sharedStore.config
    }
  }
}

// 启动微前端应用
const startMicroApp = async (appName: string) => {
  if (!containerRef.value) return
  
  const config = microAppConfig[appName]
  if (!config) return
  
  await startApp({
    name: config.name,
    url: config.url,
    el: containerRef.value,
    props: config.props,
    alive: true,
    sync: true,
    // 生命周期钩子
    beforeLoad: () => {
      console.log(`加载 ${appName} 应用`)
    },
    afterMount: () => {
      console.log(`${appName} 应用挂载完成`)
    }
  })
}

// 监听路由变化
watch(
  () => currentApp.value,
  (newApp) => {
    if (newApp) {
      startMicroApp(newApp)
    }
  },
  { immediate: true }
)

// 应用切换处理
const handleSwitchApp = (appName: string) => {
  router.push(appName === 'c-app' ? '/c-app' : '/admin')
}

// 监听子应用事件
onMounted(() => {
  // 监听子应用的用户信息更新
  bus.$on('user-info-updated', (userInfo) => {
    sharedStore.updateUserInfo(userInfo)
  })
  
  // 监听子应用的主题切换
  bus.$on('theme-changed', (theme) => {
    sharedStore.updateTheme(theme)
  })
})
</script>
```

### 2. 子应用配置

#### C端子应用 (`apps/c-app/vite.config.ts`)
```typescript
import { createVueConfig } from '@shared/config/vite'

export default createVueConfig({
  server: {
    port: 3001,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  define: {
    __MICRO_APP__: true
  }
})
```

#### C端子应用入口 (`apps/c-app/src/main.ts`)
```typescript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { useAuth } from '@shared/hooks/vue'
import type { User } from '@shared/types'

// 微前端环境检测
const isMicroApp = window.__POWERED_BY_WUJIE__

let app: any

// 微前端生命周期
if (isMicroApp) {
  // 从父应用接收数据
  const props = window.$wujie?.props || {}
  
  window.__WUJIE_MOUNT = () => {
    app = createApp(App)
    app.use(createPinia())
    app.use(router)
    
    // 使用共享的用户信息
    if (props.userInfo) {
      const { login } = useAuth()
      login(props.userInfo)
    }
    
    app.mount('#app')
  }
  
  window.__WUJIE_UNMOUNT = () => {
    app?.unmount()
  }
} else {
  // 独立运行
  app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}
```

#### B端子应用 (`apps/admin-app/vite.config.ts`)
```typescript
import { createReactConfig } from '@shared/config/vite'

export default createReactConfig({
  server: {
    port: 3002,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  define: {
    __MICRO_APP__: true
  }
})
```

#### B端子应用入口 (`apps/admin-app/src/main.tsx`)
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { useAuth } from '@shared/hooks/react'

const isMicroApp = window.__POWERED_BY_WUJIE__

let root: ReactDOM.Root

if (isMicroApp) {
  // 微前端环境
  window.__WUJIE_MOUNT = () => {
    const props = window.$wujie?.props || {}
    
    root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
      <BrowserRouter>
        <App {...props} />
      </BrowserRouter>
    )
  }
  
  window.__WUJIE_UNMOUNT = () => {
    root?.unmount()
  }
} else {
  // 独立运行
  root = ReactDOM.createRoot(document.getElementById('root')!)
  root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}
```

### 3. 共享状态管理

#### 父应用共享状态 (`apps/shell-app/src/stores/shared.ts`)
```typescript
import { defineStore } from 'pinia'
import { bus } from 'wujie'
import type { User } from '@shared/types'

export const useSharedStore = defineStore('shared', {
  state: () => ({
    userInfo: null as User | null,
    theme: 'light' as 'light' | 'dark',
    config: {
      apiBaseUrl: 'http://localhost:8080',
      enableRealtime: true
    }
  }),
  
  actions: {
    updateUserInfo(userInfo: User) {
      this.userInfo = userInfo
      // 通知所有子应用
      bus.$emit('user-info-updated', userInfo)
    },
    
    updateTheme(theme: 'light' | 'dark') {
      this.theme = theme
      // 通知所有子应用
      bus.$emit('theme-changed', theme)
      // 更新CSS变量
      document.documentElement.setAttribute('data-theme', theme)
    },
    
    logout() {
      this.userInfo = null
      bus.$emit('user-logout')
    }
  }
})
```

## 📝 迁移步骤

### 阶段一：创建 Monorepo 结构
```bash
# 1. 创建新的 monorepo 目录
mkdir BMT-MicroApps-Monorepo
cd BMT-MicroApps-Monorepo

# 2. 创建目录结构
mkdir -p apps/shell-app apps/c-app apps/admin-app
mkdir -p packages/shared-config packages/shared-types packages/shared-hooks packages/shared-components packages/shared-utils

# 3. 初始化根 package.json
pnpm init

# 4. 创建 workspace 配置
echo "packages:\n  - 'apps/*'\n  - 'packages/*'" > pnpm-workspace.yaml
```

### 阶段二：创建共享包
```bash
# 1. 初始化共享包
cd packages/shared-config && pnpm init
cd ../shared-types && pnpm init  
cd ../shared-hooks && pnpm init
cd ../shared-components && pnpm init
cd ../shared-utils && pnpm init

# 2. 从现有项目提取共享代码
# 提取类型定义、工具函数、通用组件等
```

### 阶段三：创建父应用 (shell-app)
```bash
cd apps/shell-app
pnpm init
pnpm add vue@^3.5.13 vue-router@^4.5.0 pinia@^3.0.1
pnpm add wujie-vue3@^1.0.29
pnpm add -D vite@^6.2.1 @vitejs/plugin-vue@^5.2.1
```

### 阶段四：迁移子应用
```bash
# 1. 迁移 C端应用
cp -r ../../BMT-MicroApps/src apps/c-app/
cp ../../BMT-MicroApps/package.json apps/c-app/
# 修改 package.json 中的依赖，添加共享包依赖

# 2. 迁移 B端应用  
cp -r ../../BMT-MicroApps/BadmintonFrontend-B/* apps/admin-app/
# 修改 package.json 中的依赖，添加共享包依赖
```

### 阶段五：配置统一化
```bash
# 1. 安装构建工具
pnpm add -D turbo concurrently

# 2. 创建统一配置文件
# 创建 turbo.json、eslint.config.js 等

# 3. 更新各应用配置
# 修改 vite.config.ts 使用共享配置
# 更新 tsconfig.json 继承基础配置
```

## 🎯 核心优势

### 1. 真正的三应用架构
- **父应用**：纯粹的微前端容器，负责路由分发和状态管理
- **C端子应用**：独立的 Vue3 应用，可单独开发和部署
- **B端子应用**：独立的 React 应用，可单独开发和部署

### 2. 完美的共享机制
- **共享 Hooks**：Vue 和 React 版本的相同逻辑 hooks
- **共享组件**：设计系统级别的组件库
- **共享配置**：统一的构建、代码规范配置
- **共享类型**：TypeScript 类型定义统一管理

### 3. 沙箱环境完全兼容
- **构建时**：通过共享配置包自动应用统一配置
- **运行时**：通过无界 props 传递配置和状态
- **开发时**：每个应用都可以独立运行和调试

### 4. 开发体验极佳
- **独立开发**：每个应用都可以独立启动开发
- **统一构建**：Turborepo 提供增量构建和缓存
- **类型安全**：共享类型确保跨应用的类型一致性
- **代码复用**：hooks 和组件可以在不同框架间复用

### 5. 部署灵活性
- **独立部署**：每个应用可以独立部署到不同域名
- **统一部署**：也可以通过父应用统一部署
- **渐进升级**：可以逐步迁移现有功能到新架构

这个方案完美解决了你的需求：**Vue3 父应用 + C端/B端子应用 + 共享配置/组件/hooks**，同时保持了极高的灵活性和可维护性！🚀
