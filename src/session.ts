import { WebSocketAdapter } from './adapter'

type WebSocketEvents = {
  onOpen?: () => void
  onClose?: () => void
  onMessage?: (data: any) => void
  onError?: (data: any) => void
}

export class Session {
  static wsAdapter: WebSocketAdapter

  open(url: string, events: WebSocketEvents) {
    if (!Session.wsAdapter) {
      Session.wsAdapter = WebSocketAdapter.create(url, events)
    } else {
      console.warn('Connection to WebSocket is already opened.')
    }
  }

  close() {
    this.checkConnection(() => Session.wsAdapter.close())
    Session.wsAdapter = null
  }

  sendMessage(data: any) {
    this.checkConnection(() => Session.wsAdapter.send(data))
  }

  readyState() {
    return Session.wsAdapter ? Session.wsAdapter.readyState : -1
  }

  private checkConnection(command: () => void) {
    this.readyState() === 1 ? command() : console.error("Connection to WebSocket has not opened yet.")
  }
}
