import type { Data, Events, Options } from './types'

const DEFAULT_OPTIONS: Options = {
  waitToReconnect: 3000,
  maxReconnectAttempts: 3
}

export default class WsWrapper {
  url: string

  websocketEvents: Events

  socket: WebSocket | undefined

  options: Options

  cleanup = false

  reopened = false

  private reconnectAttempts = 0

  private reconnectTimer: ReturnType<typeof setTimeout> | undefined

  constructor(url: string, websocketEvents: Events, options?: Partial<Options>) {
    this.url = url
    this.websocketEvents = websocketEvents
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  createConnection(): void {
    this.cleanup = false
    this.socket = new WebSocket(this.url)
    this.socket.onopen = this.handleOpen.bind(this) as WebSocket['onopen']
    this.socket.onmessage = this.handleMessage.bind(this) as WebSocket['onmessage']
    this.socket.onclose = this.handleClose.bind(this) as WebSocket['onclose']
    this.socket.onerror = this.handleError.bind(this) as WebSocket['onerror']
  }

  closeConnection(): void {
    this.cleanup = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    this.socket?.close()
  }

  handleOpen(): void {
    console.info('Socketto:', 'WebSocket connection is opened')

    if (this.reopened && this.websocketEvents.onReconnect) {
      this.websocketEvents.onReconnect()
    } else if (this.websocketEvents.onOpen) {
      this.websocketEvents.onOpen()
    }

    this.reopened = true
    this.reconnectAttempts = 0
  }

  handleMessage(message: MessageEvent): void {
    if (this.websocketEvents.onMessage) this.websocketEvents.onMessage(message)
  }

  handleFailed(): void {
    console.error('Socketto:', `Failed to create a connection to ${this.url}`)
    if (this.websocketEvents.onFailed) this.websocketEvents.onFailed()
  }

  handleError(event: Event): void {
    console.error('Socketto:', 'WebSocket error', event)
  }

  handleClose(): void {
    console.info('Socketto:', 'WebSocket connection is closed')
    if (this.cleanup) return
    this.reconnect()
  }

  reconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.handleFailed()
      return
    }

    // calculating timeout based on exponential backoff
    const timeout = 2 ** this.reconnectAttempts * this.options.waitToReconnect
    if (this.websocketEvents.onRetry) this.websocketEvents.onRetry()

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      console.info(
        'Socketto:',
        `Trying to reconnect: ${this.reconnectAttempts + 1} of ${this.options.maxReconnectAttempts}`
      )
      this.createConnection()
      this.reconnectAttempts++
    }, timeout)
  }

  send(data: Data): void {
    this.socket?.send(data)
  }

  get readyState(): number | undefined {
    return this.socket?.readyState
  }
}
