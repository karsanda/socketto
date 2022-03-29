/* eslint-disable no-unused-vars */
import { Session } from './session'

export function openConnection(url: string, events: WebSocketCallback = {}, options: Options = {}) {
  const session = new Session(options)
  session.create(url, events)
  return session
}
