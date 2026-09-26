---
'socketto': major
---

Socketto 3.0: modern packaging, a more reliable reconnect, and new connection features.

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
