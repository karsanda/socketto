import { afterEach, describe, expect, inject, test, vi } from 'vitest'
import Socketto from '../../src/index'

const url = inject('wsUrl')

let ws: Socketto | undefined

afterEach(() => {
  ws?.closeConnection()
  ws = undefined
})

describe('Socketto in a real browser', () => {
  test('sends and receives messages', async () => {
    const onMessage = vi.fn<(event: MessageEvent) => void>()
    ws = new Socketto(url, { onMessage })
    ws.createConnection()

    // queued until the connection opens
    ws.send('hello')
    await vi.waitFor(() => expect(onMessage).toHaveBeenCalled())
    expect(onMessage.mock.calls[0][0].data).toBe('hello')
  })

  test('reconnects after the server closes the connection', async () => {
    const onClose = vi.fn<(event: CloseEvent) => void>()
    const onReconnect = vi.fn<() => void>()
    ws = new Socketto(url, { onClose, onReconnect }, { waitToReconnect: 50 })
    ws.createConnection()
    ws.send('__close:4001')

    await vi.waitFor(() => expect(onReconnect).toHaveBeenCalled())
    expect(onClose.mock.calls[0][0].code).toBe(4001)
    expect(ws.readyState).toBe(WebSocket.OPEN)
  })

  test('reconnects after the connection drops', async () => {
    const onReconnect = vi.fn<() => void>()
    const onMessage = vi.fn<(event: MessageEvent) => void>()
    ws = new Socketto(url, { onReconnect, onMessage }, { waitToReconnect: 50 })
    ws.createConnection()
    ws.send('__drop')

    await vi.waitFor(() => expect(onReconnect).toHaveBeenCalled())
    ws.send('after reconnect')
    await vi.waitFor(() => expect(onMessage).toHaveBeenCalled())
    expect(onMessage.mock.calls[0][0].data).toBe('after reconnect')
  })

  test('negotiates subprotocols', async () => {
    const onMessage = vi.fn<(event: MessageEvent) => void>()
    ws = new Socketto(url, { onMessage }, { protocols: ['chat.v2', 'chat.v1'] })
    ws.createConnection()
    ws.send('__protocol')

    await vi.waitFor(() => expect(onMessage).toHaveBeenCalled())
    expect(onMessage.mock.calls[0][0].data).toBe('chat.v2')
  })

  test('uses the given binaryType', async () => {
    const onMessage = vi.fn<(event: MessageEvent) => void>()
    ws = new Socketto(url, { onMessage }, { binaryType: 'arraybuffer' })
    ws.createConnection()
    ws.send(new Uint8Array([1, 2, 3]))

    await vi.waitFor(() => expect(onMessage).toHaveBeenCalled())
    const { data } = onMessage.mock.calls[0][0]
    expect(data).toBeInstanceOf(ArrayBuffer)
    expect([...new Uint8Array(data)]).toEqual([1, 2, 3])
  })
})
