<h1 align="center">
   Socketto <a href="https://www.npmjs.org/package/socketto"> 
   <img src="https://img.shields.io/npm/v/socketto.svg?style=flat" alt="npm"></a>
   <img alt="NPM" src="https://img.shields.io/npm/l/socketto">
</h1>  
<p align="center">< 1 kB wrapper for <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebSocket">WebSocket Web API</a> with reconnect feature based on exponential backoff</p>  
  
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
After installation, you can create a WebSocket connection by using `openConnection`. All events are optional, but the URL is required:  
```
import { openConnection } from 'socketto'

const ws = openConnection('ws://localhost:8080', {
  onOpen: () => console.log('OPEN'),
  onConnectFailed: () => console.log('FAILED TO CONNECT'),
  onMessage: (data) => { console.log(`RECEIVED MESSAGE ${data}`) },
  onError: (err) => { console.log(`ERROR: ${err}`) }
})
```

## Events  
You can add callbacks up to four event handler that WebSocket listens to:

### onOpen()  
This event will be triggered when WebSocket connection is opened

### onConnectFailed()  
This event will be triggered when WebSocket is failed to connect after trying to reconnect a few times  

### onMessage(data)
This event will be triggered when WebSocket receives message from server. Usually is used to render the message in UI. The parameter can be anything (e.g. string, object, etc.)  

### onError(err)
This event will be triggered when WebSocket encounters an error (e.g. failed to estabilish a connection)

## Reconnect  
Socketto does reconnect by default using [exponential backoff](https://en.wikipedia.org/wiki/Exponential_backoff). It means that Socketto will increase the waiting time between retries after each retry failure. On default configuration, Socketto will try to reconnect 3 times, and wait for 3 seconds at the first retry. You can change the configuration when opening the connection. For example:
```
import { openConnection } from 'socketto'

const ws = openConnection('ws://localhost:8080', {
  // event callbacks
}, {
  maxReconnectAttempts: 5,
  waitToReconnect: 5000
})
```
With this configuration, Socketto will try to reconnect 5 times maximum, and will wait for 5 seconds for the first retry.

## API
After WebSocket connection is estabilished, you can use these API methods:  

### .close()  
```
ws.close()
```
Close the WebSocket connection. This API doesn't trigger exponential backoff and reconnect

### .send()
```
ws.send('send-dummy-message')
```
Send a data through WebSocket connection. It receives data as parameter.  

### .readyState()
```
ws.readyState()
```
Returns the current state of WebSocket connection based on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState)  
|Value | State      | Description                                              |
|------|------------|----------------------------------------------------------|
| 0    | CONNECTING | Socket has been created. The connection is not yet open. |
| 1    | OPEN	    | The connection is open and ready to communicate.         |
| 2    | CLOSING    | The connection is in the process of closing.             |
| 3    | CLOSED	    | The connection is closed or couldn't be opened.          |  
