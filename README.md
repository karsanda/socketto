<h1 align="center">Socketto</h1>

<p align="center">
  <a href="https://github.com/karsanda/socketto/actions/workflows/ci.yml"><img src="https://github.com/karsanda/socketto/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/socketto"><img src="https://img.shields.io/npm/v/socketto.svg" alt="npm"></a>
  <a href="https://bundlejs.com/?q=socketto"><img src="https://img.shields.io/bundlejs/size/socketto" alt="bundle size"></a>
  <img src="https://img.shields.io/npm/l/socketto" alt="license">
</p>

<p align="center">Tiny wrapper for the <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebSocket">WebSocket Web API</a> with automatic reconnect, a message queue, heartbeats, and offline handling.</p>

## Installation

```bash
npm i socketto
# or
yarn add socketto
# or
pnpm add socketto
```

Socketto ships ES module and CommonJS builds with type definitions:

```js
import Socketto from 'socketto' // ESM
const Socketto = require('socketto') // CommonJS
```

## Usage

```js
import Socketto from 'socketto'

const ws = new Socketto(
  'ws://localhost:8080',
  {
    // all events are optional
    onOpen: () => console.log('open'),
    onReconnect: () => console.log('reconnected'),
    onMessage: (event) => console.log('message', event.data),
    onRetry: () => console.log('retrying'),
    onFailed: () => console.log('gave up'),
    onClose: (event) => console.log('closed', event.code),
    onError: (event) => console.log('error', event)
  },
  {
    // all options are optional, omitted ones use their defaults
    waitToReconnect: 1000,
    maxReconnectAttempts: 5
  }
)

ws.createConnection()
ws.send('hello') // queued until the connection is open
```

Both the events and options arguments can be omitted:

```js
const ws = new Socketto('ws://localhost:8080')
```

### With React

```jsx
import { useEffect, useRef, useState } from 'react'
import Socketto from 'socketto'

function Chat({ url }) {
  const [messages, setMessages] = useState([])
  const socket = useRef(null)

  useEffect(() => {
    const ws = new Socketto(url, {
      onMessage: (event) => setMessages((previous) => [...previous, event.data])
    })
    ws.createConnection()
    socket.current = ws
    return () => ws.closeConnection()
  }, [url])

  return (
    <>
      <button onClick={() => socket.current?.send('hi')}>Say hi</button>
      <ul>
        {messages.map((message, i) => (
          <li key={i}>{message}</li>
        ))}
      </ul>
    </>
  )
}
```

## Events

| Event              | Called when                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onOpen()`         | The connection opens for the first time.                                                                                                                                                                           |
| `onReconnect()`    | The connection opens again after a reconnect. If not given, `onOpen` is called instead.                                                                                                                            |
| `onMessage(event)` | A message arrives. `event` is the [MessageEvent](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent); the payload is in `event.data` (string, Blob, or ArrayBuffer). Heartbeat pongs are not passed on. |
| `onRetry()`        | A reconnect attempt is scheduled. Not called once `maxReconnectAttempts` is reached.                                                                                                                               |
| `onFailed()`       | Reconnecting gave up after `maxReconnectAttempts` attempts. Call `createConnection()` to start over.                                                                                                               |
| `onClose(event)`   | The connection closes, including when you call `closeConnection()`. `event` is the [CloseEvent](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent). A heartbeat timeout reports code `4000`.             |
| `onError(event)`   | The WebSocket reports an error.                                                                                                                                                                                    |

## Options

| Option                 | Default | Description                                                                                                                           |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `waitToReconnect`      | `3000`  | Milliseconds to wait before the first reconnect attempt. Doubles after each failed attempt.                                           |
| `maxReconnectAttempts` | `3`     | Reconnect attempts before giving up and calling `onFailed`. Use `Infinity` to never give up.                                          |
| `maxReconnectDelay`    | `30000` | Upper limit for the delay between attempts, in milliseconds.                                                                          |
| `jitter`               | `0.2`   | Randomly shortens each delay by up to this fraction (0–1), so many clients don't reconnect at the same moment. `0` disables it.       |
| `protocols`            | –       | [Subprotocol(s)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket#protocols) passed to the WebSocket constructor. |
| `binaryType`           | –       | [`'blob'` or `'arraybuffer'`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/binaryType) for binary messages.             |
| `queueMessages`        | `true`  | Queue `send()` calls while connecting or reconnecting. See [Message queue](#message-queue).                                           |
| `maxQueueSize`         | `100`   | Maximum number of queued messages. Further messages are dropped.                                                                      |
| `heartbeat`            | off     | `{ interval, timeout, message?, pong? }`. See [Heartbeat](#heartbeat).                                                                |
| `reconnectOnOnline`    | `true`  | In browsers, wait while offline and reconnect as soon as the network is back. See [Offline handling](#offline-handling).              |
| `logger`               | silent  | An object with `info`, `warn` and `error` methods, e.g. `console`, to log what Socketto does.                                         |

## Reconnect

When the connection drops, Socketto reconnects using [exponential backoff](https://en.wikipedia.org/wiki/Exponential_backoff): the delay starts at `waitToReconnect` and doubles after each failed attempt, up to `maxReconnectDelay`. With the defaults, Socketto tries 3 times, waiting about 3, 6, and 12 seconds (each delay is up to 20% shorter because of `jitter`).

```js
const ws = new Socketto(
  'ws://localhost:8080',
  {},
  {
    waitToReconnect: 5000,
    maxReconnectAttempts: 5,
    jitter: 0
  }
)
```

With this configuration, Socketto tries 5 times, waiting exactly 5, 10, 20, 30, and 30 seconds (the delay is capped by `maxReconnectDelay`).

Socketto doesn't reconnect after you call `closeConnection()`.

## Message queue

`send()` returns `true` when the message was sent or queued, and `false` when it was dropped.

While Socketto is connecting or reconnecting, messages are queued (up to `maxQueueSize`) and sent in order as soon as the connection opens. The queue is cleared when you call `closeConnection()` or when reconnecting fails. Messages sent before `createConnection()` or after `closeConnection()` are dropped.

Set `queueMessages: false` to drop messages whenever the connection isn't open.

## Heartbeat

Some connections die without a close event, for example when a laptop sleeps or a proxy drops idle connections. A heartbeat notices this and reconnects:

```js
const ws = new Socketto(
  'ws://localhost:8080',
  {},
  {
    heartbeat: {
      interval: 30000, // send a ping every 30s while connected
      timeout: 10000, // reconnect if nothing arrives within 10s after a ping
      message: 'ping', // ping payload (default 'ping')
      pong: 'pong' // optional: incoming 'pong' messages are not passed to onMessage
    }
  }
)
```

Any message from the server counts as a response. When the timeout expires, Socketto calls `onClose` with code `4000` and reconnects.

## Offline handling

In browsers, Socketto listens for the [`online` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/online_event). While `navigator.onLine` is `false`, reconnect attempts are paused (and don't count towards `maxReconnectAttempts`). When the network comes back, Socketto reconnects immediately. Set `reconnectOnOnline: false` to turn this off.

## API

### `new Socketto(url, events?, options?)`

Creates a client. Nothing connects until you call `createConnection()`.

### `.createConnection()`

Opens the connection. Calling it again replaces the current connection, and starts over after `onFailed`.

### `.closeConnection(code?, reason?)`

Closes the connection with an optional [close code and reason](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close), cancels any pending reconnect, and clears the message queue.

### `.send(data)`

Sends a string, ArrayBuffer, Blob, or ArrayBufferView (e.g. a typed array), the same types as [WebSocket.send()](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send). Objects must be serialized first (e.g. `JSON.stringify`). Returns `false` if the message was dropped.

### `.readyState`

The [state](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState) of the current connection, or `undefined` before `createConnection()` and while waiting to reconnect after a heartbeat timeout.

| Value | State      | Description                                              |
| ----- | ---------- | -------------------------------------------------------- |
| 0     | CONNECTING | Socket has been created. The connection is not yet open. |
| 1     | OPEN       | The connection is open and ready to communicate.         |
| 2     | CLOSING    | The connection is in the process of closing.             |
| 3     | CLOSED     | The connection is closed or couldn't be opened.          |

## TypeScript

The event, option, and data types are available on the `Socketto` namespace:

```ts
import Socketto from 'socketto'

const events: Socketto.WebSocketEvents = {
  onMessage: (event) => console.log(event.data)
}
const options: Partial<Socketto.WebSocketOptions> = { maxReconnectAttempts: 5 }

const ws = new Socketto('ws://localhost:8080', events, options)
```

Also available: `Socketto.WebSocketData`, `Socketto.WebSocketHeartbeat`, and `Socketto.WebSocketLogger`.

## Migrating from 2.x

- **Node.js 22+** is required, and the UMD build is gone. Use the ES module or CommonJS build.
- **Silent by default.** Pass `logger: console` to get the old logs.
- **Jitter is on by default**, so reconnect delays are up to 20% shorter than `waitToReconnect * 2^attempt`. Set `jitter: 0` for the old exact delays, which are now also capped by `maxReconnectDelay` (30s).
- **`send()` queues** messages while connecting or reconnecting instead of throwing, and returns a boolean.
- **`onRetry`** is no longer called for the last attempt. `onFailed` fires right away when attempts run out.
- **Types** moved to `Socketto.WebSocketEvents`, `Socketto.WebSocketOptions`, etc.
- **Internals** (`socket`, `cleanup`, `reopened`, …) are private. Use `readyState` and the events instead.

## Development

Requires Node.js 22+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm test            # unit tests (Vitest)
pnpm test:coverage   # unit tests with coverage thresholds
pnpm test:browser    # real-browser tests (run `pnpm exec playwright install chromium` once)
pnpm lint            # lint (oxlint)
pnpm format          # format (oxfmt)
pnpm typecheck       # type-check (TypeScript)
pnpm build           # build ESM + CJS with type definitions (tsdown), then run publint and attw
pnpm size            # check the bundle size budget
```

### Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets). Add a changeset to each PR that changes the published package:

```bash
pnpm changeset
```

When changesets land on `main`, the release workflow opens a "Version Packages" PR. Merging it publishes to npm with provenance and updates `CHANGELOG.md`.
