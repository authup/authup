<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-adapter-redis</h1>

<p align="center">
    <b>Share verified Authup token results between processes through Redis.</b><br>
    A <code>RedisTokenCache</code> for the <code>TokenVerifier</code> of <code>@authup/server-adapter-kit</code>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-adapter-redis"><img src="https://img.shields.io/npm/v/@authup/server-adapter-redis" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why @authup/server-adapter-redis?

A `TokenVerifier` caches verified results only in the cache you pass it. `MemoryTokenCache` keeps them per process; several replicas of an API verify every token again. This package keeps them in Redis, so every replica reads the result one of them verified. It lives in a package of its own so that a resource server using only the memory cache never installs `ioredis`.

## Installation

```shell
npm install @authup/server-adapter-redis @authup/server-adapter-kit ioredis
```

The package is ESM-only and needs Node.js `>=26.0.0`. Its one peer dependency is `ioredis` (`^6.0.0`).

## Usage

```typescript
import { TokenVerifier } from '@authup/server-adapter-kit';
import { RedisTokenCache } from '@authup/server-adapter-redis';

const verifier = new TokenVerifier({
    baseURL: 'https://auth.example.com',
    cache: new RedisTokenCache('redis://127.0.0.1:6379'),
    maxRemoteCacheTTL: 60,
});
```

`RedisTokenCache` takes a connection string, an `ioredis` client, or nothing (`redis://127.0.0.1:6379`). Entries are stored under `vouchly:<key>`, the key being the SHA-256 hash the verifier hands over, and expire with the result's ttl.

## API

| Export | Kind | Purpose |
|---|---|---|
| `RedisTokenCache` | class | Redis-backed `ITokenCache` of `@authup/server-adapter-kit` |

## Notes

- **An outage reads as a miss.** A failing `get` (unreachable Redis, a key of another type, a value that is no JSON) answers `undefined`, so the token is verified again instead of the request failing.
- **Signing keys are not stored here.** The verifier keeps them in process memory, since a `CryptoKey` cannot be serialized.

## License

Apache-2.0. See [LICENSE](./LICENSE).
