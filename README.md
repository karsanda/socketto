<h1 align="center">
   Socketto <a href="https://www.npmjs.org/package/socketto"> 
   <img src="https://img.shields.io/npm/v/socketto.svg?style=flat" alt="npm"></a>
   <img alt="NPM" src="https://img.shields.io/npm/l/socketto">
</h1>  
<p align="center">Tiny wrapper for <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebSocket">WebSocket Web API</a></p>
  
## Installation
Install with npm:
```
npm i socketto
```

Install with yarn:
```
yarn add socketto
```

## Usage
You can create a WebSocket connection based on the example below:
```
import Socketto from 'socketto'

const ws = new Socketto('ws://localhost:8080',
  { // these events are optional
    onOpen: () => console.log('OPEN'),
    onReconnect: () => console.log('RECONNECT'),
    onMessage: (data) => { console.log(`RECEIVED MESSAGE ${data}`) },
    onRetry: () => { console.log('RETRY TO CONNECT') },
    onFailed: () => { console.log('FAILED TO CREATE CONNECTION') }
  },
  { // these options are optional
    waitToReconnect: 1000,
    maxReconnectAttempts: 4
  }
)

// open connection
ws.createConnection()
```

## Events  
You can add callbacks up to four event handler that WebSocket listens to:

### onOpen()  
This event will be triggered when WebSocket connection is opened

### onReconnect()
This event will be triggered when WebSocket connection is estabilished successfully after retry

### onMessage(data)
This event will be triggered when WebSocket receives message from server. Usually is used to render the message in UI. The parameter can be anything (e.g. string, object, etc.)  

### onRetry()
This event will be triggered everytime WebSocket try to reconnect

### onFailed()
This event will be triggered when WebSocket failed to create a connection after retry a certain times

## Options
### waitToReconnect
How long WebSocket will wait before trying to reconnect. Default value is 3 seconds

### maxReconnectAttempts
Maximum retry number allowed. Default value is 3

## Reconnect  
Socketto can reconnect by default using [exponential backoff](https://en.wikipedia.org/wiki/Exponential_backoff). It means that Socketto will increase the waiting time between retries after each retry failure. On default configuration, Socketto will try to reconnect 3 times, and wait for 3 seconds at the first retry. You can change the configuration when opening the connection. For example:
```
import Socketto from 'socketto'

const ws = new Socketto('ws://localhost:8080', {
  // event callbacks
}, {
  maxReconnectAttempts: 5,
  waitToReconnect: 5000
})
```
With this configuration, Socketto will try to reconnect 5 times maximum, and will wait for 5 seconds for the first retry.

## API
### .createConnection()
```
ws.createConnection()
```
This API will try to open a WebSocket connection based on constructor parameters

### .closeConnection()
```
ws.closeConnection()
```
Close the WebSocket connection. By calling this API, WebSocket will immediately close its connection without retry

### .send()
```
ws.send('send-dummy-message')
```
Send any data through WebSocket connection

### .readyState
```
ws.readyState
```
Returns the current state of WebSocket connection based on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState)  
|Value | State      | Description                                              |
|------|------------|----------------------------------------------------------|
| 0    | CONNECTING | Socket has been created. The connection is not yet open. |
| 1    | OPEN       | The connection is open and ready to communicate.         |
| 2    | CLOSING    | The connection is in the process of closing.             |
| 3    | CLOSED     | The connection is closed or couldn't be opened.          |
