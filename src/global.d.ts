/* eslint-disable no-unused-vars */
type WebSocketEvents = {
  onOpen?: () => void
  onReconnect?: () => void
  onMessage?: (message: MessageEvent<any>) => void
  onRetry?: () => void
  onFailed?: () => void
}

type WebSocketOptions = {
  waitToReconnect: number
  maxReconnectAttempts: number
}
