import type { Data, Events, Heartbeat, Logger, Options } from './types'

const CONNECTING = 0
const OPEN = 1

const DEFAULT_OPTIONS: Options = {
  waitToReconnect: 3000,
  maxReconnectAttempts: 3,
  maxReconnectDelay: 30000,
  jitter: 0.2,
  queueMessages: true,
  maxQueueSize: 100,
  reconnectOnOnline: true
}

// idle: never connected, active: connected or reconnecting,
// closed: closed by the user, failed: gave up after maxReconnectAttempts
type State = 'idle' | 'active' | 'closed' | 'failed'

class Socketto {
  #url: string
  #events: Events
  #options: Options
  #state: State = 'idle'
  #socket: WebSocket | undefined
  #hasOpened = false
  #attempts = 0
  #queue: Data[] = []
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined
  #heartbeatInterval: ReturnType<typeof setInterval> | undefined
  #heartbeatTimeout: ReturnType<typeof setTimeout> | undefined
  #networkListeners: AbortController | undefined

  constructor(url: string, websocketEvents: Events = {}, options: Partial<Options> = {}) {
    this.#url = url
    this.#events = websocketEvents
    this.#options = { ...DEFAULT_OPTIONS, ...options }
  }

  createConnection(): void {
    this.#state = 'active'
    this.#attempts = 0
    this.#clearReconnectTimer()
    this.#listenForNetwork()
    this.#connect()
  }

  closeConnection(code?: number, reason?: string): void {
    this.#state = 'closed'
    this.#queue = []
    this.#clearReconnectTimer()
    this.#stopHeartbeat()
    this.#networkListeners?.abort()
    this.#networkListeners = undefined
    this.#socket?.close(code, reason)
  }

  /**
   * Sends data, or queues it while (re)connecting.
   * Returns false when the data was dropped.
   */
  send(data: Data): boolean {
    if (this.#socket?.readyState === OPEN) {
      this.#socket.send(data)
      return true
    }
    if (this.#state !== 'active' || !this.#options.queueMessages) return false
    if (this.#queue.length >= this.#options.maxQueueSize) {
      this.#log('warn', 'Message queue is full, dropping message')
      return false
    }
    this.#queue.push(data)
    return true
  }

  get readyState(): number | undefined {
    return this.#socket?.readyState
  }

  #connect(): void {
    this.#detach()

    const socket = new WebSocket(this.#url, this.#options.protocols)
    if (this.#options.binaryType) socket.binaryType = this.#options.binaryType

    // #detach() removes these, so replaced sockets can't trigger a reconnect
    socket.onopen = () => this.#handleOpen(socket)
    socket.onmessage = (event) => this.#handleMessage(event)
    socket.onclose = (event) => this.#handleClose(event)
    socket.onerror = (event) => this.#handleError(event)
    this.#socket = socket
  }

  #detach(): void {
    const socket = this.#socket
    if (!socket) return

    this.#stopHeartbeat()
    this.#socket = undefined
    socket.onopen = null
    socket.onmessage = null
    socket.onclose = null
    socket.onerror = null
    if (socket.readyState === CONNECTING || socket.readyState === OPEN) socket.close()
  }

  #handleOpen(socket: WebSocket): void {
    this.#log('info', 'WebSocket connection is opened')

    if (this.#hasOpened && this.#events.onReconnect) {
      this.#events.onReconnect()
    } else if (this.#events.onOpen) {
      this.#events.onOpen()
    }

    this.#hasOpened = true
    this.#attempts = 0
    this.#startHeartbeat()

    const queue = this.#queue
    this.#queue = []
    for (const data of queue) socket.send(data)
  }

  #handleMessage(event: MessageEvent): void {
    this.#clearHeartbeatTimeout()
    const pong = this.#options.heartbeat?.pong
    if (pong !== undefined && event.data === pong) return
    if (this.#events.onMessage) this.#events.onMessage(event)
  }

  #handleError(event: Event): void {
    this.#log('error', 'WebSocket error', event)
    if (this.#events.onError) this.#events.onError(event)
  }

  #handleClose(event: CloseEvent): void {
    this.#log('info', 'WebSocket connection is closed')
    this.#stopHeartbeat()
    if (this.#events.onClose) this.#events.onClose(event)
    if (this.#state === 'active') this.#scheduleReconnect()
  }

  #scheduleReconnect(): void {
    if (this.#attempts >= this.#options.maxReconnectAttempts) {
      this.#fail()
      return
    }
    // retries resume from the 'online' listener
    if (this.#isOffline()) {
      this.#log('info', 'Network is offline, waiting to reconnect')
      return
    }

    // exponential backoff, capped, with random jitter below the computed delay
    const { waitToReconnect, maxReconnectDelay, jitter } = this.#options
    const delay = Math.min(2 ** this.#attempts * waitToReconnect, maxReconnectDelay)
    const timeout = delay * (1 - jitter * Math.random())
    if (this.#events.onRetry) this.#events.onRetry()

    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = undefined
      if (this.#isOffline()) return
      this.#attempts++
      this.#log(
        'info',
        `Trying to reconnect: ${this.#attempts} of ${this.#options.maxReconnectAttempts}`
      )
      this.#connect()
    }, timeout)
  }

  #fail(): void {
    this.#state = 'failed'
    this.#queue = []
    this.#log('error', `Failed to create a connection to ${this.#url}`)
    if (this.#events.onFailed) this.#events.onFailed()
  }

  #clearReconnectTimer(): void {
    clearTimeout(this.#reconnectTimer)
    this.#reconnectTimer = undefined
  }

  #startHeartbeat(): void {
    const heartbeat: Heartbeat | undefined = this.#options.heartbeat
    if (!heartbeat) return

    this.#heartbeatInterval = setInterval(() => {
      this.#socket?.send(heartbeat.message ?? 'ping')
      this.#heartbeatTimeout ??= setTimeout(() => this.#handleHeartbeatTimeout(), heartbeat.timeout)
    }, heartbeat.interval)
  }

  #stopHeartbeat(): void {
    clearInterval(this.#heartbeatInterval)
    this.#heartbeatInterval = undefined
    this.#clearHeartbeatTimeout()
  }

  #clearHeartbeatTimeout(): void {
    clearTimeout(this.#heartbeatTimeout)
    this.#heartbeatTimeout = undefined
  }

  #handleHeartbeatTimeout(): void {
    this.#log('warn', 'Heartbeat timed out, reconnecting')
    // don't wait for the browser to notice a dead connection
    this.#detach()
    if (this.#events.onClose) {
      this.#events.onClose(createCloseEvent(4000, 'heartbeat timeout'))
    }
    this.#scheduleReconnect()
  }

  #listenForNetwork(): void {
    if (
      !this.#options.reconnectOnOnline ||
      this.#networkListeners ||
      typeof globalThis.addEventListener !== 'function'
    ) {
      return
    }

    this.#networkListeners = new AbortController()
    globalThis.addEventListener('online', () => this.#handleOnline(), {
      signal: this.#networkListeners.signal
    })
  }

  #handleOnline(): void {
    const readyState = this.#socket?.readyState
    if (this.#state !== 'active' || readyState === OPEN || readyState === CONNECTING) return

    this.#log('info', 'Network is back online, reconnecting')
    this.#clearReconnectTimer()
    this.#attempts = 0
    this.#connect()
  }

  #isOffline(): boolean {
    return (
      this.#networkListeners !== undefined &&
      typeof navigator !== 'undefined' &&
      navigator.onLine === false
    )
  }

  #log(level: keyof Logger, ...args: unknown[]): void {
    this.#options.logger?.[level]('Socketto:', ...args)
  }
}

// CloseEvent is not a global before Node 23
function createCloseEvent(code: number, reason: string): CloseEvent {
  if (typeof CloseEvent === 'function') {
    return new CloseEvent('close', { code, reason, wasClean: false })
  }
  return Object.assign(new Event('close'), { code, reason, wasClean: false }) as CloseEvent
}

// Types are exposed on the default export (e.g. `Socketto.WebSocketEvents`) so the
// CommonJS build can stay `module.exports = Socketto` with matching typings.
declare namespace Socketto {
  export type WebSocketData = Data
  export type WebSocketEvents = Events
  export type WebSocketOptions = Options
  export type WebSocketHeartbeat = Heartbeat
  export type WebSocketLogger = Logger
}

export default Socketto
