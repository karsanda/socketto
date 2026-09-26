<h1 align="center">
   Socketto <a href="https://www.npmjs.org/package/socketto"> 
   <img src="https://img.shields.io/npm/v/socketto.svg?style=flat" alt="npm"></a>
   <img alt="NPM" src="https://img.shields.io/npm/l/socketto">
</h1>  
<p align="center">Tiny wrapper for <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebSocket">WebSocket Web API</a></p>
  
## Installation
Install with npm:
```bash
npm i socketto
```

Install with yarn:
```bash
yarn add socketto
```

## Usage
You can create a WebSocket connection based on the example below:
```js
import Socketto from 'socketto'

const ws = new Socketto('ws://localhost:8080',
  { // these events are optional
    onOpen: () => console.log('OPEN'),
    onReconnect: () => console.log('RECONNECT'),
    onMessage: (event) => { console.log(`RECEIVED MESSAGE ${event.data}`) },
    onRetry: () => { console.log('RETRY TO CONNECT') },
    onFailed: () => { console.log('FAILED TO CREATE CONNECTION') }
  },
  { // these options are optional, any omitted option falls back to its default
    waitToReconnect: 1000,
    maxReconnectAttempts: 4
  }
)

// open connection
ws.createConnection()
```

Both the events and options arguments can be omitted:
```js
const ws = new Socketto('ws://localhost:8080')
```

## Events  
You can pass up to five optional callbacks that are called on WebSocket events:

### onOpen()  
This event will be triggered when WebSocket connection is opened

### onReconnect()
This event will be triggered when WebSocket connection is established successfully after retry. If `onReconnect` is not given, `onOpen` is called instead

### onMessage(event)
This event will be triggered when WebSocket receives message from server. Usually is used to render the message in UI. The parameter is the [MessageEvent](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent), and the payload sent by the server is available in `event.data` (e.g. string, Blob, ArrayBuffer)  

### onRetry()
This event will be triggered every time WebSocket tries to reconnect. It is not triggered once the maximum number of attempts is reached

### onFailed()
This event will be triggered when WebSocket failed to create a connection after `maxReconnectAttempts` retries

## Options
All options are optional. Any option that is not given uses its default value.

### waitToReconnect
How long (in milliseconds) WebSocket will wait before the first reconnect attempt. Default value is 3000 (3 seconds)

### maxReconnectAttempts
Maximum retry number allowed. Default value is 3

## Reconnect  
Socketto can reconnect by default using [exponential backoff](https://en.wikipedia.org/wiki/Exponential_backoff). It means that Socketto will increase the waiting time between retries after each retry failure. On default configuration, Socketto will try to reconnect 3 times, waiting 3, 6, and 12 seconds before each retry. You can change the configuration when opening the connection. For example:
```js
import Socketto from 'socketto'

const ws = new Socketto('ws://localhost:8080', {
  // event callbacks
}, {
  maxReconnectAttempts: 5,
  waitToReconnect: 5000
})
```
With this configuration, Socketto will try to reconnect 5 times maximum, and will wait for 5 seconds for the first retry (then 10, 20, 40, and 80 seconds).

## API
### .createConnection()
```js
ws.createConnection()
```
This API will try to open a WebSocket connection based on constructor parameters

### .closeConnection()
```js
ws.closeConnection()
```
Close the WebSocket connection. By calling this API, WebSocket will immediately close its connection without retry. Any pending reconnect attempt is cancelled

### .send(data)
```js
ws.send('send-dummy-message')
```
Send data through WebSocket connection. Accepts the same types as [WebSocket.send()](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send): string, ArrayBuffer, Blob, or ArrayBufferView (e.g. typed arrays). Objects must be serialized first (e.g. `JSON.stringify`)

### .readyState
```js
ws.readyState
```
Returns the current state of WebSocket connection based on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState), or `undefined` if `.createConnection()` has not been called yet  
|Value | State      | Description                                              |
|------|------------|----------------------------------------------------------|
| 0    | CONNECTING | Socket has been created. The connection is not yet open. |
| 1    | OPEN       | The connection is open and ready to communicate.         |
| 2    | CLOSING    | The connection is in the process of closing.             |
| 3    | CLOSED     | The connection is closed or couldn't be opened.          |

## TypeScript
Socketto ships with type definitions. The event and option types are exported as well:
```ts
import Socketto, { WebSocketEvents, WebSocketOptions } from 'socketto'

const events: WebSocketEvents = {
  onMessage: (event) => console.log(event.data)
}
const options: Partial<WebSocketOptions> = { maxReconnectAttempts: 5 }

const ws = new Socketto('ws://localhost:8080', events, options)
```
