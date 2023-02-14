export default class WsWrapper {
  url: string

  websocketEvents: WebSocketEvents

  socket: WebSocket | undefined

  waitToReconnect: number

  maxReconnectAttempts: number

  cleanup = false

  reopened = false

  private reconnectAttempts = 0

  constructor(
    url: string,
    websocketEvents: WebSocketEvents,
    waitToReconnect?: number,
    maxReconnectAttempts?: number
  ) {
    this.url = url
    this.websocketEvents = websocketEvents
    this.waitToReconnect = waitToReconnect || 3000
    this.maxReconnectAttempts = maxReconnectAttempts || 3
  }

  createConnection() {
    this.socket = new WebSocket(this.url)
    this.socket.onopen = this.handleOpen.bind(this) as WebSocket['onopen']
    this.socket.onmessage = this.handleMessage.bind(this) as WebSocket['onmessage']
    this.socket.onclose = this.handleClose.bind(this) as WebSocket['onclose']
    this.socket.onerror = this.handleError.bind(this) as WebSocket['onerror']
  }

  closeConnection() {
    this.cleanup = true
    this.socket?.close()
  }

  handleOpen() {
    console.info('Socketto:', 'WebSocket connection is opened')

    if (this.reopened && this.websocketEvents.onReconnect) {
      this.websocketEvents.onReconnect()
    } else if (this.websocketEvents.onOpen) {
      this.websocketEvents.onOpen()
      this.reopened = true
    }

    this.reconnectAttempts = 0
  }

  handleMessage(message: MessageEvent) {
    if (this.websocketEvents.onMessage) this.websocketEvents.onMessage(message)
  }

  handleFailed() {
    console.error('Socketto:', `Failed to create a connection to ${this.url}`)
    if (this.websocketEvents.onFailed) this.websocketEvents.onFailed()
  }

  handleError(event: Event) {
    console.error('Socketto', `Error: ${event}`)
  }

  handleClose() {
    console.info('Socketto:', 'WebSocket connection is closed')
    if (this.cleanup) return
    this.reconnect()
  }

  reconnect() {
    // calculating timeout based on exponential backoff
    const timeout = 2 ** this.reconnectAttempts * this.waitToReconnect
    if (this.websocketEvents.onRetry) this.websocketEvents.onRetry()

    setTimeout(() => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.info('Socketto:', `Trying to reconnect: ${this.reconnectAttempts + 1} of ${this.maxReconnectAttempts}`)
        this.createConnection()
        this.reconnectAttempts++
      } else {
        this.handleFailed()
      }
    }, timeout)
  }

  send(message: string) {
    this.socket?.send(message)
  }

  get readyState() {
    return this.socket?.readyState
  }
}
