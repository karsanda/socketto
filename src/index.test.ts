import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import WS from 'vitest-websocket-mock'
import Socketto from './index'

const url = 'ws://localhost:8080'

let server: WS

// lets mock-socket deliver its (timer based) events
const flush = () => vi.advanceTimersByTimeAsync(10)

const createEvents = () => ({
  onOpen: vi.fn<() => void>(),
  onReconnect: vi.fn<() => void>(),
  onMessage: vi.fn<(event: MessageEvent) => void>(),
  onRetry: vi.fn<() => void>(),
  onFailed: vi.fn<() => void>(),
  onClose: vi.fn<(event: CloseEvent) => void>(),
  onError: vi.fn<(event: Event) => void>()
})

const createLogger = () => ({
  info: vi.fn<Console['info']>(),
  warn: vi.fn<Console['warn']>(),
  error: vi.fn<Console['error']>()
})

beforeEach(() => {
  vi.useFakeTimers()
  // no jitter: delays are exactly waitToReconnect * 2 ** attempt
  vi.spyOn(Math, 'random').mockReturnValue(0)
  server = new WS(url)
})

afterEach(() => {
  WS.clean()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('connection', () => {
  test('works without events and options', async () => {
    const ws = new Socketto(url)
    expect(ws.readyState).toBeUndefined()

    ws.createConnection()
    await flush()
    expect(ws.readyState).toBe(1)

    expect(ws.send('message')).toBe(true)
    await flush()
    expect(server).toHaveReceivedMessages(['message'])
    server.send('reply')

    ws.closeConnection()
    await flush()
    expect(ws.readyState).toBe(3)
  })

  test('passes the MessageEvent to onMessage', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events)
    ws.createConnection()
    await flush()

    server.send('hello')
    expect(events.onMessage).toHaveBeenCalledTimes(1)
    expect(events.onMessage.mock.calls[0][0].data).toBe('hello')
    ws.closeConnection()
  })

  test('keeps only one live socket when createConnection is called twice', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events)
    ws.createConnection()
    ws.createConnection()
    await flush()

    expect(server.server.clients()).toHaveLength(1)
    expect(events.onOpen).toHaveBeenCalledTimes(1)

    server.close()
    await flush()
    expect(events.onRetry).toHaveBeenCalledTimes(1)
    ws.closeConnection()
  })
})

describe('events', () => {
  test('calls onOpen first and onReconnect after a reconnect', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events)
    ws.createConnection()
    await flush()
    expect(events.onOpen).toHaveBeenCalledTimes(1)

    server.close()
    server = new WS(url)
    await vi.advanceTimersByTimeAsync(3000)
    await flush()

    expect(events.onReconnect).toHaveBeenCalledTimes(1)
    expect(events.onOpen).toHaveBeenCalledTimes(1)
    ws.closeConnection()
  })

  test('calls onReconnect even when onOpen is not given', async () => {
    const onReconnect = vi.fn<() => void>()
    const ws = new Socketto(url, { onReconnect })
    ws.createConnection()
    await flush()

    server.close()
    server = new WS(url)
    await vi.advanceTimersByTimeAsync(3010)
    expect(onReconnect).toHaveBeenCalledTimes(1)
    ws.closeConnection()
  })

  test('falls back to onOpen on reconnect when onReconnect is not given', async () => {
    const onOpen = vi.fn<() => void>()
    const ws = new Socketto(url, { onOpen })
    ws.createConnection()
    await flush()

    server.close()
    server = new WS(url)
    await vi.advanceTimersByTimeAsync(3010)
    expect(onOpen).toHaveBeenCalledTimes(2)
    ws.closeConnection()
  })

  test('calls onClose with the CloseEvent, including user closes', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events)
    ws.createConnection()
    await flush()

    ws.closeConnection(4001, 'bye')
    await flush()
    expect(events.onClose).toHaveBeenCalledTimes(1)
    expect(events.onClose.mock.calls[0][0]).toMatchObject({ code: 4001, reason: 'bye' })
    expect(events.onRetry).not.toHaveBeenCalled()
  })

  test('calls onError when the connection fails', async () => {
    server.close()
    const events = createEvents()
    const ws = new Socketto(url, events, { maxReconnectAttempts: 0 })
    ws.createConnection()
    await flush()

    expect(events.onError).toHaveBeenCalledTimes(1)
    expect(events.onFailed).toHaveBeenCalledTimes(1)
  })
})

describe('reconnect', () => {
  test('retries with exponential backoff, then calls onFailed', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events)
    ws.createConnection()
    await flush()

    server.close()
    await flush()
    expect(events.onRetry).toHaveBeenCalledTimes(1)

    // attempt 1 after 3s, attempt 2 after 6s, attempt 3 after 12s
    for (const [delay, retries] of [
      [3000, 2],
      [6000, 3]
    ]) {
      await vi.advanceTimersByTimeAsync(delay - 20)
      expect(events.onRetry).toHaveBeenCalledTimes(retries - 1)
      await vi.advanceTimersByTimeAsync(20)
      expect(events.onRetry).toHaveBeenCalledTimes(retries)
    }

    await vi.advanceTimersByTimeAsync(12010)
    expect(events.onRetry).toHaveBeenCalledTimes(3)
    expect(events.onFailed).toHaveBeenCalledTimes(1)
  })

  test('merges partial options with the defaults', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events, { maxReconnectAttempts: 1 })
    ws.createConnection()
    await flush()

    server.close()
    // default waitToReconnect is still 3000
    await vi.advanceTimersByTimeAsync(2990)
    expect(events.onError).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(20)
    expect(events.onError).toHaveBeenCalledTimes(1)
    expect(events.onFailed).toHaveBeenCalledTimes(1)
  })

  test('caps the delay at maxReconnectDelay', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events, {
      waitToReconnect: 1000,
      maxReconnectDelay: 1500,
      maxReconnectAttempts: 5
    })
    ws.createConnection()
    await flush()

    server.close()
    await vi.advanceTimersByTimeAsync(1010)
    expect(events.onError).toHaveBeenCalledTimes(1)
    // second delay would be 2000 without the cap
    await vi.advanceTimersByTimeAsync(1510)
    expect(events.onError).toHaveBeenCalledTimes(2)
    ws.closeConnection()
  })

  test('applies jitter below the computed delay', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const events = createEvents()
    const ws = new Socketto(url, events, { waitToReconnect: 1000, jitter: 0.5 })
    ws.createConnection()
    await flush()

    server.close()
    await vi.advanceTimersByTimeAsync(490)
    expect(events.onError).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(20)
    expect(events.onError).toHaveBeenCalledTimes(1)
    ws.closeConnection()
  })

  test('does not reconnect when closed while a retry is pending', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events)
    ws.createConnection()
    await flush()

    server.close()
    await flush()
    ws.closeConnection()
    server = new WS(url)
    await vi.advanceTimersByTimeAsync(10000)
    expect(server.server.clients()).toHaveLength(0)
    expect(events.onReconnect).not.toHaveBeenCalled()
  })

  test('reconnects again after closeConnection and createConnection', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events)
    ws.createConnection()
    await flush()
    ws.closeConnection()
    await flush()

    ws.createConnection()
    await flush()
    server.close()
    await flush()
    expect(events.onRetry).toHaveBeenCalledTimes(1)
    ws.closeConnection()
  })

  test('can connect again with createConnection after failing', async () => {
    server.close()
    const events = createEvents()
    const ws = new Socketto(url, events, { maxReconnectAttempts: 0 })
    ws.createConnection()
    await flush()
    expect(events.onFailed).toHaveBeenCalledTimes(1)

    server = new WS(url)
    ws.createConnection()
    await flush()
    expect(ws.readyState).toBe(1)
    ws.closeConnection()
  })
})

describe('message queue', () => {
  test('queues messages until the connection opens', async () => {
    const ws = new Socketto(url)
    ws.createConnection()
    expect(ws.send('first')).toBe(true)
    expect(ws.send('second')).toBe(true)
    await flush()

    expect(server).toHaveReceivedMessages(['first', 'second'])
    ws.closeConnection()
  })

  test('queues messages while reconnecting', async () => {
    const ws = new Socketto(url)
    ws.createConnection()
    await flush()

    server.close()
    await flush()
    expect(ws.send('queued')).toBe(true)

    server = new WS(url)
    await vi.advanceTimersByTimeAsync(3010)
    expect(server).toHaveReceivedMessages(['queued'])
    ws.closeConnection()
  })

  test('drops messages when not connecting', async () => {
    const ws = new Socketto(url)
    expect(ws.send('before')).toBe(false)

    ws.createConnection()
    await flush()
    ws.closeConnection()
    await flush()
    expect(ws.send('after')).toBe(false)
  })

  test('drops messages when queueing is disabled or the queue is full', () => {
    const noQueue = new Socketto(url, {}, { queueMessages: false })
    noQueue.createConnection()
    expect(noQueue.send('message')).toBe(false)
    noQueue.closeConnection()

    const logger = createLogger()
    const small = new Socketto(url, {}, { maxQueueSize: 1, logger })
    small.createConnection()
    expect(small.send('first')).toBe(true)
    expect(small.send('second')).toBe(false)
    expect(logger.warn).toHaveBeenCalled()
    small.closeConnection()
  })

  test('clears the queue when reconnecting fails', async () => {
    server.close()
    const ws = new Socketto(url, {}, { maxReconnectAttempts: 0 })
    ws.createConnection()
    ws.send('lost')
    await flush()

    server = new WS(url)
    ws.createConnection()
    await flush()
    expect(server.messages).toEqual([])
    ws.closeConnection()
  })
})

describe('heartbeat', () => {
  const heartbeat = { interval: 1000, timeout: 500, message: 'ping', pong: 'pong' }

  test('sends pings and swallows pongs', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events, { heartbeat })
    ws.createConnection()
    await flush()

    await vi.advanceTimersByTimeAsync(1000)
    expect(server).toHaveReceivedMessages(['ping'])
    server.send('pong')
    await vi.advanceTimersByTimeAsync(1000)

    expect(server.messages).toEqual(['ping', 'ping'])
    expect(events.onMessage).not.toHaveBeenCalled()
    expect(events.onClose).not.toHaveBeenCalled()
    ws.closeConnection()
  })

  test('reconnects when no message arrives before the timeout', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events, { heartbeat })
    ws.createConnection()
    await flush()

    await vi.advanceTimersByTimeAsync(1500)
    expect(events.onClose).toHaveBeenCalledTimes(1)
    expect(events.onClose.mock.calls[0][0]).toMatchObject({
      code: 4000,
      reason: 'heartbeat timeout'
    })
    expect(events.onRetry).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(3010)
    expect(events.onReconnect).toHaveBeenCalledTimes(1)
    ws.closeConnection()
  })

  test('sends the default ping and reconnects without callbacks', async () => {
    // CloseEvent is not a global in Node 22
    vi.stubGlobal('CloseEvent', undefined)
    const ws = new Socketto(url, {}, { heartbeat: { interval: 1000, timeout: 500 } })
    ws.createConnection()
    await flush()

    await vi.advanceTimersByTimeAsync(1000)
    expect(server).toHaveReceivedMessages(['ping'])
    await vi.advanceTimersByTimeAsync(500)
    expect(ws.readyState).toBeUndefined()

    await vi.advanceTimersByTimeAsync(3010)
    expect(ws.readyState).toBe(1)
    ws.closeConnection()
  })

  test('passes a synthetic CloseEvent when CloseEvent is not available', async () => {
    vi.stubGlobal('CloseEvent', undefined)
    const events = createEvents()
    const ws = new Socketto(url, events, { heartbeat })
    ws.createConnection()
    await flush()

    await vi.advanceTimersByTimeAsync(1500)
    expect(events.onClose.mock.calls[0][0]).toBeInstanceOf(Event)
    expect(events.onClose.mock.calls[0][0]).toMatchObject({ code: 4000, wasClean: false })
    ws.closeConnection()
  })
})

describe('options', () => {
  test('passes protocols to the WebSocket', async () => {
    WS.clean()
    const selectProtocol = vi.fn<(protocols: string[]) => string>((protocols) => protocols[0])
    server = new WS(url, { selectProtocol })

    const ws = new Socketto(url, {}, { protocols: ['v2', 'v1'] })
    ws.createConnection()
    await flush()
    expect(selectProtocol).toHaveBeenCalledWith(['v2', 'v1'])
    ws.closeConnection()
  })

  test('is silent by default and logs through the given logger', async () => {
    const info = vi.spyOn(console, 'info')
    const silent = new Socketto(url)
    silent.createConnection()
    await flush()
    silent.closeConnection()
    await flush()
    expect(info).not.toHaveBeenCalled()

    const logger = createLogger()
    const verbose = new Socketto(url, {}, { logger })
    verbose.createConnection()
    await flush()
    expect(logger.info).toHaveBeenCalledWith('Socketto:', 'WebSocket connection is opened')
    verbose.closeConnection()
  })
})

describe('online/offline', () => {
  let network: EventTarget
  let navigatorStub: { onLine: boolean }

  beforeEach(() => {
    network = new EventTarget()
    navigatorStub = { onLine: true }
    vi.stubGlobal('navigator', navigatorStub)
    vi.stubGlobal('addEventListener', network.addEventListener.bind(network))
  })

  test('waits while offline and reconnects as soon as the network is back', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events)
    ws.createConnection()
    await flush()

    navigatorStub.onLine = false
    server.close()
    await vi.advanceTimersByTimeAsync(60000)
    expect(events.onRetry).not.toHaveBeenCalled()
    expect(events.onFailed).not.toHaveBeenCalled()

    navigatorStub.onLine = true
    server = new WS(url)
    network.dispatchEvent(new Event('online'))
    await flush()
    expect(events.onReconnect).toHaveBeenCalledTimes(1)
    ws.closeConnection()
  })

  test('holds a pending retry when the network goes offline before it fires', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events)
    ws.createConnection()
    await flush()

    server.close()
    await flush()
    expect(events.onRetry).toHaveBeenCalledTimes(1)

    navigatorStub.onLine = false
    await vi.advanceTimersByTimeAsync(60000)
    expect(events.onError).not.toHaveBeenCalled()

    navigatorStub.onLine = true
    server = new WS(url)
    network.dispatchEvent(new Event('online'))
    await flush()
    expect(events.onReconnect).toHaveBeenCalledTimes(1)
    ws.closeConnection()
  })

  test('ignores online events while connected', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events)
    ws.createConnection()
    await flush()

    network.dispatchEvent(new Event('online'))
    await flush()
    expect(server.server.clients()).toHaveLength(1)
    expect(events.onOpen).toHaveBeenCalledTimes(1)
    ws.closeConnection()
  })

  test('stops listening after closeConnection', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events)
    ws.createConnection()
    await flush()
    ws.closeConnection()
    await flush()

    network.dispatchEvent(new Event('online'))
    await flush()
    expect(events.onReconnect).not.toHaveBeenCalled()
    expect(ws.readyState).toBe(3)
  })

  test('can be disabled with reconnectOnOnline: false', async () => {
    const events = createEvents()
    const ws = new Socketto(url, events, { reconnectOnOnline: false })
    ws.createConnection()
    await flush()

    navigatorStub.onLine = false
    server.close()
    await flush()
    // not deferred: retries continue as usual
    expect(events.onRetry).toHaveBeenCalledTimes(1)
    ws.closeConnection()
  })
})
