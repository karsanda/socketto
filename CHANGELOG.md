# socketto

## 3.0.0

### Major Changes

- [`0b983ff`](https://github.com/karsanda/socketto/commit/0b983ff58aa1d34ca6ae620e405659b67e6ae29d) Thanks [@karsanda](https://github.com/karsanda)! - Socketto 3.0: modern packaging, a more reliable reconnect, and new connection features.

  **Breaking changes**

  - Requires Node.js 22 or later. The UMD build is gone; the package ships ES module and CommonJS builds with type definitions.
  - Silent by default. Pass `logger: console` (or any object with `info`, `warn` and `error`) to get logs.
  - Reconnect delays get random jitter by default (`jitter: 0.2`, up to 20% shorter). Set `jitter: 0` for exact delays.
  - `send()` returns a boolean and queues messages while connecting or reconnecting instead of throwing.
  - `onRetry` is no longer called for the final, failing attempt; `onFailed` fires right away.
  - Types are available as `Socketto.WebSocketEvents`, `Socketto.WebSocketOptions`, etc.
  - Internal fields (`socket`, `cleanup`, `reopened`, …) are private.

  **Fixes**

  - Partial options are merged with the defaults.
  - `onReconnect` fires even when `onOpen` isn't given.
  - `closeConnection()` cancels a pending reconnect.
  - Calling `createConnection()` again no longer leaves a second live socket.
  - Auto-reconnect works again after `closeConnection()` followed by `createConnection()`.

  **New**

  - `onClose(event)` and `onError(event)` callbacks; `closeConnection(code?, reason?)`.
  - `protocols` and `binaryType` options.
  - `maxReconnectDelay` (default 30s) caps the backoff delay.
  - Message queue (`queueMessages`, `maxQueueSize`).
  - Optional `heartbeat` that pings the server and reconnects when it stops responding.
  - Waits while the browser is offline and reconnects as soon as it's back online (`reconnectOnOnline`).
