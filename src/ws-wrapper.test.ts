/* eslint-disable no-unused-vars */
import WS from 'jest-websocket-mock'
import WsWrapper from './ws-wrapper'

const url = 'ws://localhost:8080'
const wsEvents = {
  onOpen: () => {},
  onReconnect: () => {},
  // eslint-disable-next-line no-console
  onMessage: (message: MessageEvent<any>) => console.log(message.data),
  onRetry: () => {},
  onFailed: () => {}
}

let server: WS
let wrapper: WsWrapper

beforeEach(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {})
  server = new WS(url)
  wrapper = new WsWrapper(url, wsEvents)
})

afterEach(() => {
  wrapper.closeConnection()
  WS.clean()
})

describe('#constructor', () => {
  test('should return default value based on given params', () => {
    expect(wrapper.url).toEqual(url)
    expect(wrapper.websocketEvents).toEqual(wsEvents)
    expect(wrapper.waitToReconnect).toEqual(3000)
    expect(wrapper.maxReconnectAttempts).toEqual(3)
  })
})

describe('#createConnection', () => {
  test('.socket should be instanceof WebSocket after called', () => {
    expect(wrapper.socket).toBe(undefined)
    wrapper.createConnection()
    expect(wrapper.socket instanceof WebSocket).toBe(true)
  })
})

describe('#handleOpen', () => {
  test('should call wsEvents.onOpen when connection is opened', () => {
    jest.spyOn(wsEvents, 'onOpen')
    wrapper.handleOpen()
    expect(wsEvents.onOpen).toHaveBeenCalled()
  })

  test('should call wsEvents.onReconnect when connection is reconnect', () => {
    jest.spyOn(wsEvents, 'onReconnect')
    wrapper.reopened = true
    wrapper.handleOpen()
    expect(wsEvents.onReconnect).toHaveBeenCalled()
  })
})

describe('#handleMessage', () => {
  test('should call wsEvents.onMessage', () => {
    const message = new MessageEvent('hello')
    jest.spyOn(wsEvents, 'onMessage')

    wrapper.handleMessage(message)
    expect(wsEvents.onMessage).toHaveBeenCalledWith(message)
  })
})

describe('#handleClose', () => {
  test('should not try to reconnect when cleanup', () => {
    jest.spyOn(wrapper, 'createConnection')
    wrapper.cleanup = true

    wrapper.handleClose()
    expect(wrapper.createConnection).not.toHaveBeenCalled()
  })

  test('should try to reconnect based on exponential backoff', () => {
    jest.spyOn(wsEvents, 'onRetry').mockImplementation(() => {})
    jest.spyOn(wsEvents, 'onFailed').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})

    jest.useFakeTimers()

    jest.spyOn(wrapper, 'createConnection').mockImplementation(() => {})

    wrapper.handleClose()
    jest.advanceTimersByTime(3000)
    expect(wsEvents.onRetry).toHaveBeenCalledTimes(1)
    expect(wrapper.createConnection).toHaveBeenCalledTimes(1)

    wrapper.handleClose()
    jest.advanceTimersByTime(6000)
    expect(wsEvents.onRetry).toHaveBeenCalledTimes(2)
    expect(wrapper.createConnection).toHaveBeenCalledTimes(2)

    wrapper.handleClose()
    jest.advanceTimersByTime(12000)
    expect(wsEvents.onRetry).toHaveBeenCalledTimes(3)
    expect(wrapper.createConnection).toHaveBeenCalledTimes(3)

    wrapper.handleClose()
    jest.advanceTimersByTime(24000)
    expect(wsEvents.onRetry).toHaveBeenCalledTimes(4)
    expect(wrapper.createConnection).toHaveBeenCalledTimes(3)
    expect(console.error).toHaveBeenCalled()
    expect(wsEvents.onFailed).toHaveBeenCalledTimes(1)

    jest.useRealTimers()
  })
})

describe('#closeConnection', () => {
  test('should set cleanup to true and called .socket.close()', async () => {
    wrapper.createConnection()
    jest.spyOn(wrapper.socket as WebSocket, 'close')
    await server.connected

    wrapper.closeConnection()
    expect(wrapper.cleanup).toBe(true)
    expect(wrapper.socket?.close).toHaveBeenCalled()
  })
})

describe('#send', () => {
  test('should not call .socket.send() when .socket is undefined', () => {
    wrapper.send('message')
    expect(wrapper.socket?.send).toBeUndefined()
  })

  test('it should call .socket.send() when called', async () => {
    wrapper.createConnection()
    await server.connected

    jest.spyOn(wrapper.socket as WebSocket, 'send')
    wrapper.send('message')
    expect(wrapper.socket?.send).toHaveBeenCalledWith('message')
  })
})

describe('#readyState', () => {
  test('should not call .socket.readyState when .socket is undefined', () => {
    expect(wrapper.readyState).toBeUndefined()
  })

  test('it should call .socket.readyState when called', async () => {
    wrapper.createConnection()
    await server.connected

    expect(wrapper.readyState).toEqual(1)
  })
})
