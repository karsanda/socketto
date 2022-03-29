import { Session } from '../src/session'
import { WebSocketAdapter } from '../src/adapter'

describe('Session', () => {
  const url = 'ws://stub-url'
  const onOpen = () => {}
  const onConnectFailed = () => {}
  const onMessage = () => {}
  const onError = () => {}
  const events = { onOpen, onConnectFailed, onMessage, onError }

  describe('#constructor', () => {
    test('it should set default value for maxReconnectAttempts and waitToReconnect', () => {
      const session = new Session()
      expect(session.maxReconnectAttempts).toEqual(3)
      expect(session.waitToReconnect).toEqual(3000)
    })

    test('it should set value for maxReconnectAttempts and waitToReconnect if defined', () => {
      const session = new Session({ maxReconnectAttempts: 5, waitToReconnect: 2000 })
      expect(session.maxReconnectAttempts).toEqual(5)
      expect(session.waitToReconnect).toEqual(2000)
    })
  })

  describe('#create', () => {
    test('it should call WebSocketAdapter.create', () => {
      jest.spyOn(WebSocketAdapter, 'create')
      const session = new Session()
      session.create(url, events)

      expect(WebSocketAdapter.create).toHaveBeenCalled()
      jest.spyOn(session.testonly_adapter, 'readyState', 'get').mockReturnValue(1)
      session.close()
    })
  })

  describe('#close', () => {
    let session

    beforeEach(() => {
      session = new Session()
      session.create(url, events)
    })

    test('it should call Session.adapter.close', () => {
      jest.spyOn(session.testonly_adapter, 'close')
      jest.spyOn(session.testonly_adapter, 'readyState', 'get').mockReturnValue(1)

      session.close()
      expect(session.bypassReconnect).toBe(true)
      expect(session.testonly_adapter.close).toHaveBeenCalled()
    })

    test('it should return console.error if readyState is not 1', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      session.close()
      expect(console.error).toHaveBeenCalledWith('Connection to WebSocket has not been opened yet.')
    })
  })

  describe('#send', () => {
    let session

    beforeEach(() => {
      session = new Session()
      session.create(url, events)
    })

    test('it should call Session.adapter.send', () => {
      jest.spyOn(session.testonly_adapter, 'send').mockImplementation(() => {})
      jest.spyOn(session.testonly_adapter, 'readyState', 'get').mockReturnValue(1)

      session.send('stub-data')
      expect(session.testonly_adapter.send).toHaveBeenCalledWith('stub-data')
    })

    test('it should return console.error if readyState is not 1', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})

      session.send('stub-data')
      expect(console.error).toHaveBeenCalledWith('Connection to WebSocket has not been opened yet.')
    })
  })

  describe('#readyState', () => {
    test('it should return ready state from WebSocket', () => {
      const session = new Session()
      session.create(url, events)
      expect(session.readyState()).toBe(0)
    })
  })

  describe('#adapter', () => {
    test('returns undefined if NODE_ENV is not test', () => {
      const OLD_ENV = process.env

      const session = new Session()
      session.create(url, events)

      process.env.NODE_ENV = 'development'
      expect(session.testonly_adapter).toBe(undefined)

      process.env = OLD_ENV
    })
  })

  describe('#onCloseHandler', () => {
    test('it should attempt to reconnect 3 times with exponential backoff', () => {
      jest.useFakeTimers()

      const session = new Session()
      session.create(url, events)

      jest.spyOn(session, 'create')

      session.onCloseHandler()
      jest.advanceTimersByTime(3000)
      expect(session.create).toHaveBeenCalledTimes(1)

      session.onCloseHandler()
      jest.advanceTimersByTime(6000)
      expect(session.create).toHaveBeenCalledTimes(2)

      session.onCloseHandler()
      jest.advanceTimersByTime(12000)
      expect(session.create).toHaveBeenCalledTimes(3)

      session.onCloseHandler()
      jest.advanceTimersByTime(24000)
      expect(session.create).toHaveBeenCalledTimes(3)

      jest.useRealTimers()
    })

    test('it should attempt to reconnect based on given options', () => {
      jest.useFakeTimers()

      const session = new Session({ maxReconnectAttempts: 2, waitToReconnect: 2000 })
      session.create(url, events)

      jest.spyOn(session, 'create')

      session.onCloseHandler()
      jest.advanceTimersByTime(2000)
      expect(session.create).toHaveBeenCalledTimes(1)

      session.onCloseHandler()
      jest.advanceTimersByTime(4000)
      expect(session.create).toHaveBeenCalledTimes(2)

      session.onCloseHandler()
      jest.advanceTimersByTime(8000)
      expect(session.create).toHaveBeenCalledTimes(2)

      jest.useRealTimers()
    })
  })
})
