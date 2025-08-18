/**
 * useWebSocket (Socket.IO 版本)
 *
 * 使用 socket.io-client 封装的 React Hook，提供：
 * - 自动重连（可配置起始与最大间隔）
 * - 事件消息订阅（默认监听 `message` 事件，返回最近一条消息）
 * - 发送消息（默认向 `message` 事件 emit）
 *
 * 说明：
 * - Socket.IO 自带心跳/保活机制，通常无需显式 `ping`。
 * - 若后端使用自定义事件名，可通过 `eventName` 指定。
 * - 若需要自定义 path（非默认 `/socket.io`），可通过 `path` 传入。
 *
 * @template T 服务端消息类型
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export interface UseWebSocketOptions {
  /** 服务端连接地址，如：https://api.example.com 或 wss://api.example.com */
  url: string
  /** 默认监听/发送的事件名，默认 'message' */
  eventName?: string
  /** 起始重连延时（ms），默认 1000，对应 socket.io 的 reconnectionDelay */
  reconnectInitialDelay?: number
  /** 最大重连延时（ms），默认 30000，对应 socket.io 的 reconnectionDelayMax */
  reconnectMaxDelay?: number
  /** 传输方式，默认仅使用 'websocket' */
  transports?: Array<'websocket' | 'polling'>
  /** 自定义 path（默认 '/socket.io'） */
  path?: string
  /** 握手阶段附带的鉴权数据（推荐放 token） */
  auth?: Record<string, unknown>
  /** 附加的查询参数 */
  query?: Record<string, string | number | boolean>
  /** 是否在创建时自动连接，默认 true */
  autoConnect?: boolean
  /** 最大重连次数（不传则无限次） */
  reconnectionAttempts?: number
  /**
   * 兼容旧版参数：保留字段，但在 Socket.IO 版本中通常无需显式心跳
   * 仅为向后兼容而保留，不会主动使用
   */
  heartbeatInterval?: number
}

export function useWebSocket<T = unknown>({
  url,
  eventName = 'message',
  reconnectInitialDelay = 1000,
  reconnectMaxDelay = 30000,
  transports = ['websocket'],
  path,
  auth,
  query,
  autoConnect = true,
  reconnectionAttempts,
}: UseWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<T | null>(null)

  const socketOptions = useMemo(
    () => ({
      autoConnect,
      transports,
      path,
      auth,
      query,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: reconnectInitialDelay,
      reconnectionDelayMax: reconnectMaxDelay,
      reconnectionAttempts,
    }),
    [
      autoConnect,
      transports,
      path,
      auth,
      query,
      reconnectInitialDelay,
      reconnectMaxDelay,
      reconnectionAttempts,
    ],
  )

  useEffect(() => {
    const socket = io(url, socketOptions)

    socketRef.current = socket

    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)
    const handleConnectError = () => setConnected(false)
    const handleMessage = (payload: unknown) => {
      // Socket.IO 载荷通常已是对象；若为字符串可尝试解析
      try {
        if (typeof payload === 'string') {
          setLastMessage(JSON.parse(payload) as T)
        } else {
          setLastMessage(payload as T)
        }
      } catch {
        setLastMessage((payload as unknown) as T)
      }
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on(eventName, handleMessage)

    return () => {
      // 清理监听并断开连接
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.off(eventName, handleMessage)
      socket.disconnect()
      socketRef.current = null
    }
  }, [url, eventName, socketOptions])

  const send = useCallback((payload: unknown) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit(eventName, payload)
    }
  }, [eventName])

  return { connected, lastMessage, send }
}

export default useWebSocket


