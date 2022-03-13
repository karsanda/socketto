# Socketto [![npm version](https://badge.fury.io/js/socketto.svg)](https://badge.fury.io/js/socketto)
Socketto is a tiny wrapper for [WebSocket Web API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)  
  
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
After installation, you can create a WebSocket connection by using `openConnection`. All events are optional:  
```
import { openConnection } from 'socketto'

const ws = openConnection('ws://localhost:8080', {
  onOpen: () => console.log('OPEN'),
  onClose: () => console.log('CLOSE'),
  onMessage: (data) => { console.log(`RECEIVED MESSAGE ${data}`) },
  onError: (err) => { console.log(`ERROR: ${err}`) }
})
```

## API
After WebSocket connection is estabilished, you can use these API methods:  

### .close()  
```
ws.close()
```
Close the WebSocket connection

### .sendMessage()
```
ws.sendMessage('send-dummy-message')
```
Send a data through WebSocket connection. It receives data as parameter.  

### .readyState()
```
ws.readyState()
```
Returns the current state of WebSocket connection based on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState)  
|Value | State      | Description                                              |
|------|------------|----------------------------------------------------------|
| 0    | CONNECTING	| Socket has been created. The connection is not yet open. |
| 1    | OPEN	      | The connection is open and ready to communicate.         |
| 2	   | CLOSING	  | The connection is in the process of closing.             |
| 3	   | CLOSED	    | The connection is closed or couldn't be opened.          |  
