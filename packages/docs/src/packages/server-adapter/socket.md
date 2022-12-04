# Socket

The socket middleware should be injected at the beginning of the chain. 

Besides, validating the authorization header, the `setupSocketMiddleware` also extends the request 
with general information (realm, abilities, ...) and information about the corresponding robot or user of the token.

The following guides are based on some shared assumptions:

- API URL: `http://localhost:3002/`

## Configuration

The `setupSocketMiddleware` method, accepts a configuration object for the http- and redis-client.
The redis client, if enabled, is used to cache verification responses from the backend service.

```typescript
import { Server } from 'socket.io';
import { setupSocketMiddleware } from '@authup/server-adapter';
import { createClient } from 'redis-extension';
import axios from 'axios';

// create http client
const http = axios.create({
    baseURL: 'http://localhost:3002/'
});

// create redis client
const redis = createClient({connectionString: 'redis://127.0.0.1'});

// setup socket.io server
const server = new Server();

// setup socket middleware for socket server
server.use(setupSocketMiddleware({
    redis,
    http,
    /* ... */
}));

// ...
```

For more details check out, the [API Reference]().
