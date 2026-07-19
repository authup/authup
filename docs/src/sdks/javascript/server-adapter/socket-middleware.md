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
with the verification data (realm, permissions, user/client info, etc.).

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

The middleware also tolerates `Bearer <token>` formatted values (the prefix is stripped via
`extractBearerToken`); bare tokens are passed through unchanged.

## verifySocket primitive

`createMiddleware` is a thin wrapper around the underlying primitive:

```typescript
import { verifySocket } from '@authup/server-adapter-socket-io';

const data = await verifySocket(socket, { tokenVerifier });
// data is `TokenVerificationData` when a valid token was present,
// `undefined` when no token was provided, or rejects with `BearerTokenMalformedError` /
// the underlying verifier error.
```

The optional `tokenBySocket` callback runs when `socket.handshake.auth.token` is missing — useful
when you want to pull the token from `socket.handshake.headers.authorization`, the query string,
or any other source.

For a token carrying `cnf.x5t#S256`, verification also requires
`certificateThumbprintBySocket` to return the matching base64url SHA-256 DER
thumbprint:

```typescript
const data = await verifySocket(socket, {
    tokenVerifier,
    certificateThumbprintBySocket: (socket) =>
        trustedHandshakeCertificateThumbprint(socket),
});
```

Bound tokens fail closed when the callback or certificate is absent. Treat the
callback as a TLS/proxy trust boundary; do not accept an unchecked thumbprint
sent in `handshake.auth` by the public caller.

Enforcement lives inside `TokenVerifier.verify()` itself — the helper only
forwards a lazy thumbprint provider. Calling `verify(token)` directly on a
bound token therefore also fails closed; pass the presented thumbprint via
`verify(token, { certificateThumbprint })`.
