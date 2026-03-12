# Socket.io

The socket-io server plugin provides utilities for socket.io based services.

## Installation

Add the package as a dependency to the project.

```sh
npm install @authup/server-core-plugin-socket-io --save
```

## Configuration

The socket middleware should be injected at the beginning of the chain.

Besides, validating the authorization header, the `createSocketMiddleware` also extends the request
with general information (realm, abilities, ...) and information about the corresponding robot or user of the token.

The `createMiddleware` method, accepts a configuration object.
The redis client, if enabled, is used to cache verification responses from the backend service.

```typescript
import { Server } from 'socket.io';
import { createMiddleware } from '@authup/server-core-plugin-socket-io';
import { createClient } from 'redis-extension';

// create redis client
const redis = createClient({ connectionString: 'redis://127.0.0.1' });

// setup socket.io server
const server = new Server();

// setup socket middleware for socket server
server.use(createMiddleware({
    tokenByCookie: (req, cookieName) => req.cookies[cookieName],
    tokenVerifier: {
        baseURL: 'http://localhost:3010/',
        creator: {
            type: 'user',
            name: 'admin',
            password: 'start123',
        },
        cache: {
            type: 'redis',
            client: redis
        }
    },
    tokenVerifierHandler: (req, data) => {
        console.log(data);
        // { 'realmId': 'xxx', userId: 'xxx', userName: 'xxx', ... }
    }
    /* ... */
}));

// ...
```

For more details check out, the [API Reference]().
