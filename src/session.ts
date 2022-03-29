import { WebSocketAdapter } from './adapter'

function checkConnection(adapter: WebSocketAdapter, command: () => void) {
  return adapter.readyState === 1
    ? command()
    : console.error('Connection to WebSocket has not been opened yet.')
}

export class Session {
  static adapter: WebSocketAdapter

  constructor(url: string, events: WebSocketEvents) {
    Session.adapter = WebSocketAdapter.create(url, events)
  }

  get testonly_adapter() {
    return process.env.NODE_ENV === 'test' ? Session.adapter : undefined
  }

  close() {
    checkConnection(Session.adapter, () => Session.adapter.close())
  }

  send(data: any) {
    checkConnection(Session.adapter, () => Session.adapter.send(data))
  }

  readyState() {
    return Session.adapter.readyState
  }
}
