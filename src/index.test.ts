import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import WS from 'vitest-websocket-mock'
import Socketto from './index'

const url = 'ws://localhost:8080'

let server: WS

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  server = new WS(url)
})

afterEach(() => {
  WS.clean()
})

describe('Socketto', () => {
  test('should work without events and options', async () => {
    const ws = new Socketto(url)
    expect(ws.readyState).toBeUndefined()

    ws.createConnection()
    await server.connected
    expect(ws.readyState).toEqual(1)

    ws.send('message')
    await expect(server).toReceiveMessage('message')

    ws.closeConnection()
    await server.closed
    expect(ws.readyState).toEqual(3)
  })

  test('should pass the MessageEvent to onMessage', async () => {
    const onMessage = vi.fn<(event: MessageEvent) => void>()
    const ws = new Socketto(url, { onMessage })
    ws.createConnection()
    await server.connected

    server.send('hello')
    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage.mock.calls[0][0].data).toEqual('hello')

    ws.closeConnection()
  })
})
