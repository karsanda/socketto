import { Session } from './session'

export function openConnection(url: string, events: WebSocketEvents) {
  return new Session(url, events)
}
