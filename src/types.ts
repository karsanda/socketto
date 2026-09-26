export type Events = {
  onOpen?: () => void
  onReconnect?: () => void
  onMessage?: (message: MessageEvent<any>) => void
  onRetry?: () => void
  onFailed?: () => void
}

export type Options = {
  waitToReconnect: number
  maxReconnectAttempts: number
}

export type Data = Parameters<WebSocket['send']>[0]
