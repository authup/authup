<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-kit</h1>

<p align="center">
    <b>Server-side building blocks for Authup services: crypto, JWTs, cache, logger, domain events, service contracts.</b><br>
    Factories and contracts you pass down explicitly, with no global singletons to configure.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-kit"><img src="https://img.shields.io/npm/v/@authup/server-kit" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

[`server-core`](https://github.com/authup/authup/tree/master/apps/server-core) builds on this package for key handling, token signing, password hashing, caching, logging and the domain-event bus, and its entity services extend the base classes and implement the repository port declared here. [`@authup/server-adapter-kit`](https://github.com/authup/authup/tree/master/packages/server-adapter-kit) uses it to verify tokens. Every service is created by a factory or a constructor and handed to whoever needs it; there is no `useLogger()` or other process-wide registry.

You rarely install it directly: to protect an API, use one of the server adapters. Reach for it when you write a service of your own next to Authup and want the same primitives.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Notes](#notes)
- [License](#license)

## Installation

```shell
npm install @authup/server-kit
```

It ships native bindings through `@node-rs/bcrypt` and `@node-rs/jsonwebtoken`, and depends on `winston`, `redis-extension` and the Socket.IO Redis emitter. The package is ESM only and needs Node.js `^22.13.0 || ^23.5.0 || >=24.0.0`.

## Usage

### Logger and cache

```typescript
import type { ICache, Logger } from '@authup/server-kit';
import { MemoryCache, RedisCache, createLogger, createNoopLogger } from '@authup/server-kit';

const logger: Logger = process.env.NODE_ENV === 'test' ?
    createNoopLogger() :
    createLogger({ env: process.env.NODE_ENV ?? 'development', directory: '/var/log/my-service' });

const cache: ICache = process.env.REDIS ?
    new RedisCache(process.env.REDIS) :
    new MemoryCache();

await cache.set('session:1', { user: 'alice' }, { ttl: 60_000 });
const acquired = await cache.add('lock:job', 'owner-1', { ttl: 10_000 });
const attempts = await cache.increment('attempts:alice', 1, { ttl: 60_000 });
```

- **`createLogger` writes to files in production only.** With `env: 'production'` it logs `info` to the console, `http` and above to `http.log` and `warn` and above to `error.log` in `directory` (default: the process cwd), each rotated at 10 MB with 5 files. Any other `env` logs `debug` to the console.
- **`Logger` is a structural type** with `error`, `warn`, `info`, `http`, `verbose` and `debug`, so your code does not import winston.
- **A `ttl` is in milliseconds.** `MemoryCache` keeps an entry forever when none is given.
- **`add`, `increment`, `renewIfValue` and `dropIfValue` are atomic** on both adapters (Redis `SET NX` and scripts, a single tick in memory): the building blocks of a lock and of an attempt counter. `increment` re-arms the `ttl` on every call.
- **`RedisCache` takes a connection URL, client options, an existing client or `true`** (which connects to `redis://127.0.0.1`).

### Domain events

```typescript
import type { IDomainEventHandler } from '@authup/server-kit';
import { DomainEventPublisher, DomainEventRedisHandler } from '@authup/server-kit';

declare const auditHandler: IDomainEventHandler;

const publisher = new DomainEventPublisher({ logger });
publisher.register(new DomainEventRedisHandler('redis://127.0.0.1:6379'));
publisher.register(auditHandler);

await publisher.safePublish({
    content: { type: 'role', event: 'created', data: { id: 'role-id', name: 'editor' } },
    destinations: [{ channel: 'role' }],
});
```

`publish` runs every handler even when an earlier one throws and then rejects with the first error, so a Redis outage does not keep a later handler from running. `safePublish` catches that rejection and logs it, which is what you call after a database write that must not fail because the event bus did. `DomainEventSocketHandler` emits to Socket.IO through Redis. `dispose()` calls each handler's optional `dispose()` and empties the set.

### Keys, tokens, hashes and ciphers

```typescript
import {
    CryptoAsymmetricAlgorithm,
    SymmetricCipher,
    compare,
    createAsymmetricKeyPair,
    hash,
    signToken,
    verifyToken,
} from '@authup/server-kit';

const keyPair = await createAsymmetricKeyPair({ name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5 });

const token = await signToken({ sub: 'alice' }, { type: 'rsa', key: keyPair.privateKey, keyId: 'key-1' });
const payload = await verifyToken(token, { type: 'rsa', key: keyPair.publicKey });

const hashed = await hash('secret');
const matches = await compare('secret', hashed);

const cipher = new SymmetricCipher(process.env.SECRETS_ENCRYPTION_KEY ?? '');
const plain = await cipher.decrypt(await cipher.encrypt('plain'));
```

- **`signToken` fills in `exp` (one hour) and `iat` when the claims carry none.** The algorithm defaults to RS256, ES256 or HS256 for `type: 'rsa'`, `'ec'` and `'oct'`; a `key` is a `CryptoKey` or a base64 string.
- **`verifyToken` always checks the signature and `nbf`.** Pass `{ ignoreExpiry: true }` as the third argument to skip `exp` only. Failures are thrown as `JWTError` from `@authup/specs`.
- **`hash` uses bcrypt with 10 rounds** unless you pass another count.
- **`SymmetricCipher` is AES-256-GCM over a base64 key of exactly 32 bytes** and throws at construction for any other length. A blob is `base64(iv | ciphertext | tag)` with a 12 byte IV.

### Entity service contracts

`IEntityRepository<T>` is the repository port: `findMany(query)` takes the rapiq query IR (`IQuery` from `@rapiq/core`), plus lookups by id, name and condition, `create`, `merge`, `save`, `remove` and `validateJoinColumns`. `ActorContext` is what a service receives instead of an HTTP request: a `permissionEvaluator`, the optional `identity`, and an optional `grants()` resolver. `AbstractEntityService` gives subclasses `getActorRealmId`, `getActorGrants` (which answers no grants when the resolver is missing) and `evaluateUpdate`, which evaluates a permission against both the stored and the updated row. `JunctionEntityService` adds the owner-realm accessors a junction service must declare.

## API

| Export | Kind | Purpose |
|---|---|---|
| `createLogger`, `createNoopLogger`, `Logger`, `LoggerCreateContext` | function, type | winston-backed and silent loggers |
| `ICache`, `MemoryCache`, `RedisCache`, `buildCacheKey` | interface, class, function | Cache port and its two adapters |
| `createRedisClient`, `isRedisClient`, `RedisClient`, `RedisJsonAdapter`, `RedisWatcher`, `buildRedisKeyPath`, `parseRedisKeyPath`, `escapeRedisKey` | function, class | Redis client and key helpers (re-exported from `redis-extension`) |
| `DomainEventPublisher`, `DomainEventRedisHandler`, `DomainEventSocketHandler`, `IDomainEventHandler`, `IDomainEventPublisher`, `DomainEventPublishContext` | class, interface, type | Domain-event bus |
| `buildDomainEventChannelName`, `transformDomainEventData` | function | Channel naming and payload normalization |
| `signToken`, `verifyToken`, `extractTokenHeader`, `extractTokenPayload` | function | JWT sign, verify and decode without verification |
| `createAsymmetricKeyPair`, `AsymmetricKey`, `CryptoAsymmetricAlgorithm` | function, class, enum | RSA and EC key pairs, PEM import and export |
| `createSymmetricKey`, `SymmetricKey`, `SymmetricAlgorithm` | function, class, enum | AES and HMAC keys |
| `encodePKCS8ToPEM`, `encodeSPKIToPem`, `decodePemToPKCS8`, `decodePemToSpki` | function | PEM wrapping |
| `SymmetricCipher`, `ISymmetricCipher` | class, interface | AES-256-GCM encryption at rest |
| `hash`, `compare` | function | bcrypt |
| `IEntityRepository`, `EntityRepositoryFindManyResult`, `ActorContext`, `AbstractEntityService`, `JunctionEntityService` | interface, type, class | Entity service contracts |
| `hasOwnProperty` | function | Typed own-property check |

The crypto option types (`TokenSignOptions`, `TokenVerifyOptions`, `AsymmetricKeyPairCreateOptionsInput` and their per-algorithm variants) are exported as well.

## Notes

- **Nothing here is a singleton.** Create a logger, a cache or a publisher once at boot and pass it through constructors; a component without a logger simply logs nothing.
- **`content` is the wire payload.** It is what the Redis and Socket.IO handlers ship; `dataPrevious` and `transaction` on the publish context are for in-process handlers only.
- **`extractTokenPayload` does not verify.** Use it to read a header or claims before you know which key to verify with, never as an authorization decision.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
