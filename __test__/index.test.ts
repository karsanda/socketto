import { openConnection } from '../src/index'
import { Session } from '../src/session'

describe('#openConnection', () => {
  test('it should return Session', () => {
    const url = 'ws://stub-url'
    const onOpen = () => {}
    const onClose = () => {}
    const onMessage = () => {}
    const onError = () => {}

    const ws = openConnection(url, { onOpen, onClose, onMessage, onError })
    expect(ws instanceof Session).toBe(true)
  })
})