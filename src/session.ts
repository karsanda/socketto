import { WebSocketAdapter } from './adapter'

function checkConnection(adapter: WebSocketAdapter, command: () => void) {
  return adapter.readyState === 1
    ? command()
    : console.error('Connection to WebSocket has not been opened yet.')
}

export class Session {
  static adapter: WebSocketAdapter

  bypassReconnect: boolean = false

  reconnectAttempts: number = 0

  maxReconnectAttempts: number

  waitToReconnect: number

  sessionOptions: { url: string, events: WebSocketCallback }

  constructor(options: Options = {}) {
    this.maxReconnectAttempts = options.maxReconnectAttempts || 3
    this.waitToReconnect = options.waitToReconnect || 3000
  }

  create(url: string, events: WebSocketEvents) {
    this.sessionOptions = { url, events }
    Session.adapter = WebSocketAdapter.create(url, {
      onOpen: events.onOpen,
      onClose: this.onCloseHandler.bind(this),
      onMessage: events.onMessage,
      onError: events.onError
    })
  }

  onCloseHandler() {
    if (this.bypassReconnect) return

    const timeout = 2 ** this.reconnectAttempts * this.waitToReconnect
    setTimeout(() => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.create(this.sessionOptions.url, this.sessionOptions.events)
        this.reconnectAttempts += 1
      } else {
        console.error(`Failed to create a connection to ${this.sessionOptions.url}`)
        this.sessionOptions.events.onConnectFailed()
      }
    }, timeout)
  }

  get testonly_adapter() {
    return process.env.NODE_ENV === 'test' ? Session.adapter : undefined
  }

  close() {
    this.bypassReconnect = true
    checkConnection(Session.adapter, () => Session.adapter.close())
  }

  send(data: any) {
    checkConnection(Session.adapter, () => Session.adapter.send(data))
  }

  readyState() {
    return Session.adapter.readyState
  }
}
