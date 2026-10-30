<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-adapter-socket-io</h1>

<p align="center">
    <b>Authenticate Socket.IO connections with Authup access tokens.</b><br>
    A connection middleware that verifies the handshake token and hands you the claims.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-adapter-socket-io"><img src="https://img.shields.io/npm/v/@authup/server-adapter-socket-io" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why @authup/server-adapter-socket-io?

A Socket.IO server sees no `Authorization` header per message: the caller proves who it is once, in the handshake. This package verifies the token sent there with [`@authup/server-adapter-kit`](https://github.com/authup/authup/tree/master/packages/server-adapter-kit), so a realtime server trusts the same tokens and rules as your HTTP API.

| Concern | Without it | With it |
|---|---|---|
| **Where the token is** | Dig through `socket.handshake` yourself | `handshake.auth.token` is read, with or without a `Bearer ` prefix |
| **Verification** | A second verification path next to your HTTP one | The same `TokenVerifier` your HTTP adapter uses |
| **Rejecting a connection** | Remember to call `next(error)` on every failure | A failed verification refuses the connection |
| **Bound tokens** | Compare certificate thumbprints yourself | `certificateThumbprintBySocket` feeds the RFC 8705 check |

## Installation

```shell
npm install @authup/server-adapter-socket-io @authup/server-adapter-kit
```

`TokenVerifier` comes from `@authup/server-adapter-kit`, which you import directly. The package is ESM-only, does not depend on `socket.io` itself (it types the socket structurally), has no peer dependencies and needs Node.js `>=26.0.0`.

## Usage

### Middleware

```typescript
import type { DefaultEventsMap } from 'socket.io';
import { Server } from 'socket.io';
import type { TokenVerificationData } from '@authup/server-adapter-kit';
import { TokenVerifier } from '@authup/server-adapter-kit';
import { createMiddleware } from '@authup/server-adapter-socket-io';

type SocketData = {
    auth?: TokenVerificationData,
};

const io = new Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>();

io.use(createMiddleware({
    tokenVerifier: new TokenVerifier({ baseURL: 'https://auth.example.com' }),
    tokenVerifierHandler: (socket, data) => {
        socket.data.auth = data; // data.sub, data.sub_kind, data.realm_name, data.scope
    },
}));

io.on('connection', (socket) => {
    if (!socket.data.auth) {
        socket.disconnect(true);
        return;
    }

    socket.join(`user:${socket.data.auth.sub}`);
});
```

The fourth `Server` generic types `socket.data` for every connection handler. Replace `DefaultEventsMap` with your own event maps.

The client sends the token in the handshake:

```typescript
const socket = io('https://api.example.com', { auth: { token: accessToken } });
```

- A handshake without a token is let through without running `tokenVerifierHandler`. Refuse anonymous sockets in your `connection` handler, as above, if you need a caller.
- A token that fails verification, or an error thrown by `tokenVerifierHandler`, calls `next(error)` and the connection is refused.

See [`@authup/server-adapter-kit`](https://github.com/authup/authup/tree/master/packages/server-adapter-kit) for local versus remote verification, caching and permissions.

### Verify a socket yourself

```typescript
import { verifySocket } from '@authup/server-adapter-socket-io';

const data = await verifySocket(socket, {
    tokenVerifier,
    tokenBySocket: (s) => s.handshake.query.token,
});
```

`verifySocket` resolves the verification data, resolves `undefined` when the socket carries no token, and throws otherwise. `tokenBySocket` is only called when `handshake.auth.token` is not a non-empty string.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `tokenVerifier` | `ITokenVerifier` | (required) | Usually a `TokenVerifier` from `@authup/server-adapter-kit` |
| `tokenVerifierHandler` | `(socket, data) => void \| Promise<void>` | (required, middleware only) | Runs after a token verified; store the claims here |
| `tokenBySocket` | `(socket) => string \| undefined` | `undefined` | Fallback token source when `handshake.auth.token` is missing |
| `certificateThumbprintBySocket` | `(socket) => string \| undefined \| Promise<string \| undefined>` | `undefined` | SHA-256 thumbprint of the client certificate, for certificate-bound tokens |

## API

| Export | Kind | Purpose |
|---|---|---|
| `createMiddleware` | function | Builds the `(socket, next)` middleware for `io.use` |
| `verifySocket` | function | Verifies one socket without the middleware shape |
| `MiddlewareOptions`, `VerifySocketOptions` | types | The option objects above |
| `Socket`, `Handshake`, `Next` | types | The structural socket shape the adapter needs |

## Notes

- **Verification happens once, at connection.** A token that expires or is revoked later does not disconnect the socket. Disconnect long-lived sockets yourself when `data.exp` passes.
- **Only an exact `Bearer ` prefix is stripped.** Send the bare token, or `Bearer <token>` with that casing; any other prefix is handed to the verifier as part of the token and fails.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
