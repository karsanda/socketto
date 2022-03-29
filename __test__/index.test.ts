import { openConnection } from '../src/index'
import { Session } from '../src/session'

describe('#openConnection', () => {
  const url = 'ws://stub-url'
  const onOpen = () => {}
  const onConnectFailed = () => {}
  const onMessage = () => {}
  const onError = () => {}

  const events = { onOpen, onConnectFailed, onMessage, onError }

  test('it should return Session', () => {
    jest.spyOn(Session.prototype, 'create')

    const ws = openConnection(url, events)
    expect(Session.prototype.create).toHaveBeenCalledWith(url, events)
    expect(ws instanceof Session).toBe(true)
    expect(ws.maxReconnectAttempts).toEqual(3)
    expect(ws.waitToReconnect).toEqual(3000)
  })

  test('it should be able to set maxReconnectAttempts and timeout', () => {
    const ws = openConnection(url, events, { maxReconnectAttempts: 2, waitToReconnect: 5000 })
    expect(ws.maxReconnectAttempts).toEqual(2)
    expect(ws.waitToReconnect).toEqual(5000)
  })
})
