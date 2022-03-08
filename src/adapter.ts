export class WebSocketAdapter {
  private socket: WebSocket 

  constructor(url: string) {
    this.socket = new WebSocket(url)
  }

  static create(url: string, events: WebSocketEvents) {
    const adapter = new WebSocketAdapter(url)

    adapter.onopen = events.onOpen
    adapter.onclose = events.onClose
    adapter.onmessage = events.onMessage
    adapter.onerror = events.onError

    return adapter
  }

  set onopen(event: WebSocketEvents['onOpen']) {
    this.socket.onopen = event
  }

  set onclose(event: WebSocketEvents['onClose']) {
    this.socket.onclose = event
  }

  set onmessage(event: WebSocketEvents['onMessage']) {
    this.socket.onmessage = event
  }

  set onerror(event: WebSocketEvents['onError']) {
    this.socket.onerror = event
  }

  get readyState() {
    return this.socket.readyState
  }

  close() {
    this.socket.close()
  }

  send(data: any) {
    this.socket.send(data)
  }
}