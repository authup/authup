<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/core-realtime-kit</h1>

<p align="center">
    <b>A socket.io client manager and event-name helpers for Authup's realtime entity events.</b><br>
    One manager per server: sockets per namespace, the access token sent on every handshake.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/core-realtime-kit"><img src="https://img.shields.io/npm/v/@authup/core-realtime-kit" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

When an entity changes, Authup's server publishes the change through `@authup/server-kit`'s socket handler, which emits it via a socket.io Redis emitter under a name such as `userCreated`. This package holds the two halves both sides agree on: `buildEventFullName`, which builds those names, and `ClientManager`, which a browser client uses to connect and listen. `@authup/server-kit` and [`@authup/client-web-kit`](https://github.com/authup/authup/tree/master/packages/client-web-kit) depend on it. Authup itself runs no socket.io server: the events reach a socket.io server you operate on the same Redis. Install this package directly only when you build such a client yourself.

## Installation

```shell
npm install @authup/core-realtime-kit socket.io-client
```

`socket.io-client` (`^4.8.4`) is a peer dependency: you install it. ESM only. Node.js `>=26.0.0`, or a browser bundler.

## Usage

### Connect

```typescript
import { ClientManager } from '@authup/core-realtime-kit';

const manager = new ClientManager({
    url: 'https://realtime.example.com',
    token: () => localStorage.getItem('access_token') ?? undefined,
});

const socket = await manager.connect('/');
```

- `connect(namespace)` resolves once the socket is connected, or rejects with the `connect_error`. The default namespace is `/`.
- `token` is a string or a sync or async function. It is called on every handshake and sent as `auth.token`; a function that throws sends no token.
- The underlying socket.io `Manager` is created with `autoConnect: false`; nothing connects until you call `connect`.
- A path in `url` becomes the socket.io `path`: `https://example.com/api` connects with `path: '/api/socket.io'`. An `options.path` is appended to that prefix.

### Listen for entity events

```typescript
import { EventNameSuffix, buildEventFullName } from '@authup/core-realtime-kit';

socket.emit(buildEventFullName('user', EventNameSuffix.SUBSCRIBE));

socket.on(buildEventFullName('user', EventNameSuffix.CREATED), (payload) => {
    // payload.data is the created user, payload.meta.roomName the room it was sent to
});
```

`buildEventFullName(entity, verb)` concatenates the entity name with the capitalized verb: `('user', 'created')` is `userCreated`.

### Reconnect after a token change

```typescript
await manager.reconnectAll();
```

The token is only read on the handshake, so a socket keeps the token it connected with. `reconnect(namespace)` and `reconnectAll()` disconnect and connect again to send the current one. `disconnect(namespace)` closes a socket and keeps it for later; `eject(namespace)` closes and forgets it.

## Options

`new ClientManager(ctx)`:

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | required | Server URL; its path becomes the socket.io path prefix |
| `token` | `string \| () => string \| undefined \| Promise<string \| undefined>` | | Sent as `auth.token` on every handshake |
| `options` | `Partial<ManagerOptions>` | | Passed to the socket.io-client `Manager` |

## API

| Export | Kind | Purpose |
|---|---|---|
| `ClientManager` | class | One socket.io `Manager`, one socket per namespace: `connect`, `disconnect`, `reconnect`, `reconnectAll`, `inject`, `eject`, `options` |
| `ClientManagerContext`, `ClientManagerTokenFn` | type | Constructor input and the token function |
| `buildEventFullName` | function | `entity` + capitalized `verb` |
| `EventNameSuffix` | enum | `created`, `updated`, `deleted`, `subscribe`, `unsubscribe` |
| `EventFullName`, `EventPayload` | type | The event name template and the payload shape |
| `isEventTarget`, `isEventCallback` | function | Guards for socket handler arguments |
| `STCEvents`, `CTSEvents`, `STSEvents`, `STCEventContext`, `EventCallback`, `DefaultEvents` | type | Event map types for typed sockets |

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
