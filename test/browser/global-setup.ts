import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import type { TestProject } from 'vitest/node'
import { WebSocketServer } from 'ws'

declare module 'vitest' {
  export interface ProvidedContext {
    wsUrl: string
  }
}

// Echo server with a few control messages so tests can drive the connection:
//   __close:<code>  server closes the connection with <code>
//   __drop          server terminates the connection without a close frame
//   __protocol      server replies with the negotiated subprotocol
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const server = new WebSocketServer({
    port: 0,
    handleProtocols: (protocols) => protocols.values().next().value ?? false
  })
  await once(server, 'listening')

  server.on('connection', (socket) => {
    socket.on('message', (data, isBinary) => {
      const text = isBinary ? '' : data.toString()
      if (text.startsWith('__close:')) socket.close(Number(text.slice('__close:'.length)))
      else if (text === '__drop') socket.terminate()
      else if (text === '__protocol') socket.send(socket.protocol)
      else socket.send(data, { binary: isBinary })
    })
  })

  const { port } = server.address() as AddressInfo
  project.provide('wsUrl', `ws://localhost:${port}`)

  return () => new Promise((resolve) => server.close(() => resolve()))
}
