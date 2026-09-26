/* eslint-disable no-unused-vars */
export type WebSocketEvents = {
  onOpen?: () => void
  onReconnect?: () => void
  onMessage?: (message: MessageEvent<any>) => void
  onRetry?: () => void
  onFailed?: () => void
}

export type WebSocketOptions = {
  waitToReconnect: number
  maxReconnectAttempts: number
}

export type WebSocketData = Parameters<WebSocket['send']>[0]
