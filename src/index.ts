import WsWrapper from './ws-wrapper'
import type { WebSocketData, WebSocketEvents, WebSocketOptions } from './types'

export type { WebSocketData, WebSocketEvents, WebSocketOptions }

export default class Socketto {
  private socket: WsWrapper

  constructor(url: string, websocketEvents: WebSocketEvents = {}, options: Partial<WebSocketOptions> = {}) {
    this.socket = new WsWrapper(url, websocketEvents, options)
  }

  createConnection() {
    this.socket.createConnection()
  }

  closeConnection() {
    this.socket.closeConnection()
  }

  send(data: WebSocketData) {
    this.socket.send(data)
  }

  get readyState() {
    return this.socket.readyState
  }
}
