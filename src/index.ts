import { Session } from './session'

let session = new Session()

export function openConnection(url: string, events: WebSocketEvents) {
  session.open(url, events)
}

export function closeConnection() {
  session.close()
}

export function sendMessage(data: any) {
  session.sendMessage(data)
}

export function readyState() {
  return session.readyState()
}

