import { WebSocketAdapter } from '../src/adapter'

describe('WebSocketAdapter', () => {
  const url = 'ws://stub-url'

  const onOpen = () => {}
  const onClose = () => {}
  const onMessage = () => {}
  const onError = () => {}

  describe('#constructor', () => {
    test('it should create a websocket connection', () => {
      const adapter = new WebSocketAdapter(url)
      expect(adapter.url).toEqual('ws://stub-url/')
      expect(adapter.readyState).toEqual(0)
    })
  })

  describe('#create', () => {
    const adapter = WebSocketAdapter.create(url, { onOpen, onClose, onMessage, onError })

    test('it return a new instance of WebSocketAdapter', () => {
      expect(adapter.constructor).toEqual(WebSocketAdapter)
    })

    test('it should assign onopen option', () => {
      expect(adapter.testonly_socket.onopen).toEqual(onOpen)
    })

    test('it should assign onclose option', () => {
      expect(adapter.testonly_socket.onclose).toEqual(onClose)
    })

    test('it should assign onmessage option', () => {
      expect(adapter.testonly_socket.onmessage).toEqual(onMessage)
    })

    test('it should assign onerror option', () => {
      expect(adapter.testonly_socket.onerror).toEqual(onError)
    })
  })

  describe('#close', () => {
    test('it should be able to close websocket connection', () => {
      const adapter = WebSocketAdapter.create(url, { onOpen, onClose, onMessage, onError })
      expect(adapter.readyState).toEqual(0)

      adapter.close()
      expect(adapter.readyState).toEqual(2)
    })
  })

  describe('#send', () => {
    test('it should be able to send message', () => {
      const adapter = WebSocketAdapter.create(url, { onOpen, onClose, onMessage, onError })
      jest.spyOn(adapter.testonly_socket, 'send').mockImplementation(() => {})

      adapter.send('stub-message')
      expect(adapter.testonly_socket.send).toHaveBeenCalledWith('stub-message')
    })
  })

  describe('#adapter', () => {
    test('returns undefined if NODE_ENV is not test', () => {
      const OLD_ENV = process.env

      const adapter = WebSocketAdapter.create(url, { onOpen, onClose, onMessage, onError })
      process.env.NODE_ENV = 'development'
      expect(adapter.testonly_socket).toBe(undefined)

      process.env = OLD_ENV
    })
  })
})
