type WebSocketEvents = {
  onOpen?: () => void
  onClose?: () => void
  onMessage?: (data: any) => void
  onError?: (data: any) => void
}
