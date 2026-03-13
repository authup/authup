# Socket.io

The socket.io server adapter provides middleware for socket.io based services.

## Installation

Add the package as a dependency to the project.

```sh
npm install @authup/server-adapter-socket-io --save
```

## Configuration

The socket middleware should be injected at the beginning of the chain.

The middleware validates the token from `socket.handshake.auth.token` and calls a handler
with the verification data (realm, permissions, user/robot info, etc.).

The `createMiddleware` method accepts a configuration object with a `tokenVerifier` (from `@authup/server-adapter-kit`)
and a `tokenVerifierHandler` callback.

```typescript
import { Server } from 'socket.io';
import { createMiddleware } from '@authup/server-adapter-socket-io';
import { TokenVerifier } from '@authup/server-adapter-kit';

// setup socket.io server
const server = new Server();

// create token verifier
const tokenVerifier = new TokenVerifier({
    baseURL: 'http://localhost:3010/',
    creator: {
        type: 'user',
        name: 'admin',
        password: 'start123',
    },
});

// setup socket middleware for socket server
server.use(createMiddleware({
    tokenVerifier,
    tokenVerifierHandler: (socket, data) => {
        console.log(data);
        // { sub: 'xxx', realm_id: 'xxx', permissions: [...], ... }
    }
}));

// ...
```

For more details check out, the [API Reference]().
