/* eslint-disable no-unused-vars */
type WebSocketEvents = {
  onOpen?: () => void
  onClose?: () => void
  onMessage?: (data: any) => void
  onError?: (data: any) => void
}

type WebSocketCallback = {
  onOpen?: () => void
  onMessage?: (data: any) => void
  onConnectFailed?: () => void
  onError?: (data: any) => void
}

type Options = {
  maxReconnectAttempts?: number
  waitToReconnect?: number
}
