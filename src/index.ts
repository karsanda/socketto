import WsWrapper from './ws-wrapper'
import type { Data, Events, Options } from './types'

class Socketto {
  private socket: WsWrapper

  constructor(url: string, websocketEvents: Events = {}, options: Partial<Options> = {}) {
    this.socket = new WsWrapper(url, websocketEvents, options)
  }

  createConnection(): void {
    this.socket.createConnection()
  }

  closeConnection(): void {
    this.socket.closeConnection()
  }

  send(data: Data): void {
    this.socket.send(data)
  }

  get readyState(): number | undefined {
    return this.socket.readyState
  }
}

// Types are exposed on the default export (e.g. `Socketto.WebSocketEvents`) so the
// CommonJS build can stay `module.exports = Socketto` with matching typings.
declare namespace Socketto {
  export type WebSocketData = Data
  export type WebSocketEvents = Events
  export type WebSocketOptions = Options
}

export default Socketto
