import { WebSocketAdapter } from './adapter'

export class Session {
  static adapter: WebSocketAdapter

  constructor(url: string, events: WebSocketEvents) {
    Session.adapter = WebSocketAdapter.create(url, events)
  }

  get adapter() {
    return process.env.NODE_ENV === 'test' ? Session.adapter : undefined
  }

  close() {
    checkConnection(Session.adapter, () => Session.adapter.close())
  }

  sendMessage(data: any) {
    checkConnection(Session.adapter, () => Session.adapter.send(data))
  }

  readyState() {
    return Session.adapter.readyState
  }
}

function checkConnection(adapter: WebSocketAdapter, command: () => void) {
  adapter.readyState === 1
    ? command()
    : console.error("Connection to WebSocket has not been opened yet.")
}
