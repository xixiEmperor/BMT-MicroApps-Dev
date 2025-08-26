/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'wujie' {
  export function setupApp(name: string, options?: any): void
  export function preloadApp(name: string, options?: any): void
  export function startApp(name: string, options?: any): void
  export function destroyApp(name: string): void
  export const bus: any
}

declare module 'wujie-vue3' {
  import { App } from 'vue'
  export function install(app: App): void
  export const WujieVue: any
}

declare module 'qrcode' {
  export function toDataURL(text: string, options?: any): Promise<string>
  export function toString(text: string, options?: any): Promise<string>
}