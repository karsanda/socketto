export type Data = Parameters<WebSocket['send']>[0]

export type Logger = Pick<Console, 'info' | 'warn' | 'error'>

export type Events = {
  onOpen?: () => void
  onReconnect?: () => void
  onMessage?: (message: MessageEvent<any>) => void
  onRetry?: () => void
  onFailed?: () => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
}

export type Heartbeat = {
  /** Milliseconds between pings while the connection is open */
  interval: number
  /** Milliseconds to wait for any message after a ping before reconnecting */
  timeout: number
  /** Ping payload. Defaults to `'ping'` */
  message?: Data
  /** When set, incoming messages equal to this value are not passed to `onMessage` */
  pong?: Data
}

export type Options = {
  waitToReconnect: number
  maxReconnectAttempts: number
  maxReconnectDelay: number
  jitter: number
  protocols?: string | string[]
  binaryType?: BinaryType
  queueMessages: boolean
  maxQueueSize: number
  heartbeat?: Heartbeat
  reconnectOnOnline: boolean
  logger?: Logger
}
