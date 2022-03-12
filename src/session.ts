import { WebSocketAdapter } from './adapter'

export class Session {
  static adapter: WebSocketAdapter

  constructor(url: string, events: WebSocketEvents) {
    if (!Session.adapter) {
      Session.adapter = WebSocketAdapter.create(url, events)
    } else {
      console.warn('Connection to WebSocket is already opened.')
    }
  }

  close() {
    checkConnection(Session.adapter, () => Session.adapter.close())
    Session.adapter = null
  }

  sendMessage(data: any) {
    checkConnection(Session.adapter, () => Session.adapter.send(data))
  }

  readyState() {
    return Session.adapter ? Session.adapter.readyState : -1
  }
}

function checkConnection(adapter: WebSocketAdapter, command: () => void) {
  adapter.readyState === 1
    ? command()
    : console.error("Connection to WebSocket has not opened yet.")
}
