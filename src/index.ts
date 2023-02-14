import WsWrapper from './ws-wrapper'

export default class Socketto {
  private socket: WsWrapper

  constructor(
    url: string,
    websocketEvents: WebSocketEvents,
    waitToReconnect?: number,
    maxReconnectAttempts?: number
  ) {
    this.socket = new WsWrapper(url, websocketEvents, waitToReconnect, maxReconnectAttempts)
  }

  createConnection() {
    this.socket.createConnection()
  }

  closeConnection() {
    this.socket.closeConnection()
  }

  send(message: string) {
    this.socket.send(message)
  }

  get readyState() {
    return this.socket.readyState
  }
}
