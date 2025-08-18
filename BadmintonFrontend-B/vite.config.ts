import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 路径别名配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // 开发服务器配置 - 微前端适配
  server: {
    port: 5000,  // 固定端口，与主应用微前端配置一致
    host: '0.0.0.0',  // 允许外部访问，支持主应用跨域访问
    cors: true,  // 启用CORS支持
    open: false,  // 在微前端环境中不自动打开浏览器
    
    // 配置代理，用于API请求
    proxy: {
      '/api': {
        target: 'http://localhost:8080',  // 后端服务地址
        changeOrigin: true,
        secure: false,
      },
    },
    
    // 开发环境下的CORS头部配置，解决微前端跨域问题
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
  
  // 构建配置 - 优化微前端加载
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,  // 生产环境不生成sourcemap，减少包大小
    minify: 'esbuild',  // 使用esbuild进行压缩，速度更快
    
    // 构建时的rollup选项
    rollupOptions: {
      output: {
        // 手动分割代码块，确保在微前端环境中正常加载
        manualChunks: {
          // 将React相关库打包到单独的chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 将Ant Design打包到单独的chunk
          'antd-vendor': ['antd', '@ant-design/cssinjs'],
          // 将其他第三方库打包到单独的chunk
          'vendor': ['@tanstack/react-query', 'zustand']
        },
        // 设置chunk文件名格式，便于缓存管理
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop() || ''
          if (/\.(png|jpe?g|gif|svg)$/i.test(extType)) {
            return 'images/[name]-[hash].[ext]'
          }
          if (/\.(css)$/i.test(extType)) {
            return 'css/[name]-[hash].[ext]'
          }
          return 'assets/[name]-[hash].[ext]'
        }
      }
    }
  },
  
  // 预构建配置，优化开发体验
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      '@ant-design/cssinjs',
      '@tanstack/react-query',
      'zustand'
    ],
  },
  
  // CSS配置
  css: {
    // CSS模块化配置
    modules: {
      localsConvention: 'camelCase',
    },
    // PostCSS配置
    postcss: {
      plugins: [
        // 可以在这里添加postcss插件
      ],
    },
  },
  
  // 定义全局常量
  define: {
    __IS_MICRO_APP__: JSON.stringify(process.env.NODE_ENV === 'development' ? false : true),
  },
})
