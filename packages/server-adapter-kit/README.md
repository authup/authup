<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-adapter-kit</h1>

<p align="center">
    <b>Verify Authup access tokens in your own API, locally against realm keys or by introspection.</b><br>
    The verifier, caches and bearer parsing behind the Node, Socket.IO and Web adapters.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-adapter-kit"><img src="https://img.shields.io/npm/v/@authup/server-adapter-kit" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why @authup/server-adapter-kit?

An API that trusts tokens issued by Authup has to fetch the right signing key, check the signature and expiry, reject tokens that are not access tokens, and decide how long a verified result may be reused. This package does that once, so every transport adapter (and your own code) shares the same rules.

| Concern | Without it | With it |
|---|---|---|
| **Signing keys** | Fetch the JWKS, pick the key, cache it, refetch on rotation | The key of the token's realm is fetched by `kid` and cached per realm and key for 5 minutes |
| **Permissions** | Call the introspection endpoint and parse the answer | Remote mode introspects with your API's client credentials and returns the subject's `permissions` |
| **Token kind** | A refresh token or MFA ticket signed with the same key passes a signature check | Any `kind` other than `access_token` is rejected |
| **Repeat requests** | Verify every token on every request | An optional `cache` (memory or Redis) keeps results until the token expires |
| **Bound tokens** | Compare `cnf.x5t#S256` yourself | Certificate-bound tokens (RFC 8705) fail unless the presented thumbprint matches |

For an HTTP server, a Socket.IO server or a Web `Request` handler, use one of the adapters on top of this package: [`@authup/server-adapter-node`](https://github.com/authup/authup/tree/master/packages/server-adapter-node), [`@authup/server-adapter-socket-io`](https://github.com/authup/authup/tree/master/packages/server-adapter-socket-io) or [`@authup/server-adapter-web`](https://github.com/authup/authup/tree/master/packages/server-adapter-web).

## Installation

```shell
npm install @authup/server-adapter-kit
```

The package is ESM-only and needs Node.js `>=26.0.0`. Its one peer dependency is `ioredis` (`^6.0.0`), which npm installs for you; `RedisTokenCache` connects through it. Install [`@authup/core-http-kit`](https://github.com/authup/authup/tree/master/packages/core-http-kit) as well when you use remote mode, for `createClientTokenCreator`.

## Usage

### Verify locally

```typescript
import { TokenVerifier } from '@authup/server-adapter-kit';

const verifier = new TokenVerifier({ baseURL: 'https://auth.example.com' });

const data = await verifier.verify(token);
// data.sub, data.sub_kind, data.realm_id, data.realm_name, data.scope, data.exp
```

Without a `creator` the verifier checks the token itself:

- the header's `kid` must be a UUID and the payload must carry a `realm_id`;
- the key is fetched from `GET /realms/<realm_id>/jwks/<kid>`, so a key of another realm can never verify the token;
- the signature, `exp` and the token `kind` are checked;
- `permissions` is always `[]`, since an access token does not carry them.

### Verify remotely

```typescript
import { createClientTokenCreator } from '@authup/core-http-kit';
import { TokenVerifier } from '@authup/server-adapter-kit';

const verifier = new TokenVerifier({
    baseURL: 'https://auth.example.com',
    creator: createClientTokenCreator(
        { id: process.env.AUTHUP_CLIENT_ID ?? '', secret: process.env.AUTHUP_CLIENT_SECRET ?? '' },
        { client: { baseURL: 'https://auth.example.com' } },
    ),
});

const data = await verifier.verify(token);
const canRead = data.permissions.some((permission) => permission.name === 'order_read');
```

With a `creator` the verifier sends the token to `POST /token/introspect`, authenticated with a token the creator mints (and mints again after a `401`). The answer includes the subject's `permissions`. An inactive token throws.

Give your API's client the `token_introspect` permission. Without it the client may only introspect tokens issued to itself, and every other token is reported inactive.

### Cache verified tokens

```typescript
import { MemoryTokenCache, RedisTokenCache, TokenVerifier } from '@authup/server-adapter-kit';

const verifier = new TokenVerifier({
    baseURL: 'https://auth.example.com',
    cache: new MemoryTokenCache(),
});

const shared = new TokenVerifier({
    baseURL: 'https://auth.example.com',
    cache: new RedisTokenCache('redis://127.0.0.1:6379'),
    maxRemoteCacheTTL: 60,
});
```

Verified results are cached only when you pass a `cache`. A result is kept for the token's remaining lifetime, or at most `maxRemoteCacheTTL` seconds in remote mode. Entries are keyed by a SHA-256 hash of the namespace and the token, the namespace defaulting to `authup:<local|remote>:<baseURL>`. `MemoryTokenCache` (re-exported from vouchly) keeps up to 10000 entries in process memory. `RedisTokenCache` takes a connection string, an `ioredis` client, or nothing (`redis://127.0.0.1:6379`). A cache of your own implements vouchly's `ITokenCache` (`get(key)` and `set(key, entry, ttl)`).

Signing keys are never stored in `cache`: they stay in process memory, since a `CryptoKey` cannot be serialized.

### Bound tokens

```typescript
const bound = await verifier.verify(token, {
    certificateThumbprint: () => thumbprintOfPresentedCertificate(),
});
```

A token carrying `cnf` (RFC 8705) fails unless `certificateThumbprint` resolves to the SHA-256 DER thumbprint in `cnf.x5t#S256`. The provider is only called for such tokens, and the check runs on every call, cached results included.

### Timeouts and aborts

```typescript
import { createClientTokenCreator } from '@authup/core-http-kit';
import { isUpstreamTimeoutError } from '@authup/errors';
import { TokenVerifier } from '@authup/server-adapter-kit';

const verifier = new TokenVerifier({
    baseURL: 'https://auth.example.com',
    // seconds each introspection request and key fetch may take
    timeout: 5,
    creator: createClientTokenCreator(
        { id: process.env.AUTHUP_CLIENT_ID ?? '', secret: process.env.AUTHUP_CLIENT_SECRET ?? '' },
        // milliseconds the client credentials mint may take
        { client: { baseURL: 'https://auth.example.com', timeout: 5_000 } },
    ),
});

try {
    const data = await verifier.verify(token, { signal: request.signal });
} catch (e) {
    if (isUpstreamTimeoutError(e)) {
        // authup did not answer in time: the token was not judged
        return new Response(null, { status: 503 });
    }

    throw e;
}
```

`timeout` bounds every request a verification makes: the introspection request and, in local mode, the key fetch. A verification that runs out of time throws an `UpstreamTimeoutError` (`upstream_timeout`, HTTP 504), never a `JWTError`, so it cannot be mistaken for an invalid token. Without `timeout` each request may take 10 seconds. A cached key load is bounded by `jwkCache.timeout` as well, so the smaller of the two wins: `timeout: 30` with the default key cache still stops the load after 10 seconds.

The client credentials mint of remote mode runs on the creator's own client, so the verifier's `timeout` does not reach it: set the creator client's `timeout` (in milliseconds) as well.

A `signal` passed to `verify` aborts that verification: it rejects with the signal's reason as is and cancels its introspection request. A key fetch shared with other verifications is not cancelled; the aborted call only stops waiting for it.

### Parse the Authorization header

```typescript
import { extractBearerToken } from '@authup/server-adapter-kit';

const value = extractBearerToken(authorizationHeader); // undefined when the header is absent
```

It throws `BearerTokenMalformedError` (`bearer_token_malformed`, HTTP 401) for a header without a space, a scheme other than `Bearer` (case-insensitive), or an empty value.

## Options

`new TokenVerifier(context)`:

| Option | Type | Default | Description |
|---|---|---|---|
| `baseURL` | `string` | (required) | Base URL of the Authup API |
| `timeout` | `number` | `10` | Seconds each request of a verification may take (introspection, key fetch). A finite number above 0 and at most 2147483, otherwise the constructor throws. A cached key load also stops at `jwkCache.timeout`, whichever is smaller. Running out of time throws `UpstreamTimeoutError` |
| `creator` | `TokenCreator` | `undefined` | Switches to remote mode: mints the token the introspection call authenticates with |
| `cache` | `ITokenCache \| false` | `undefined` | Caches verified results; without it every call verifies again |
| `cacheNamespace` | `string` | `authup:<local\|remote>:<baseURL>` | Separates the entries of verifiers sharing one cache. Only verifiers with the same configuration may share a namespace |
| `maxRemoteCacheTTL` | `number` | remaining token lifetime | Upper bound in seconds for caching a remote result |
| `jwkCache` | `{ ttl?, timeout? } \| false` | `{ ttl: 300, timeout: 10 }` | Signing key cache for local mode, held in process memory. `ttl` is seconds a key stays cached (`0` stores nothing), `timeout` the seconds a cached key load may take. The fetch inside the load is also bounded by the verifier's `timeout`, so the smaller of the two wins. `false` fetches the key on every verification |

`verify(token, options)`:

| Option | Type | Default | Description |
|---|---|---|---|
| `certificateThumbprint` | `string \| () => string \| undefined \| Promise<string \| undefined>` | `undefined` | Thumbprint of the presented client certificate, or a lazy provider for it |
| `signal` | `AbortSignal` | `undefined` | Aborts this verification; it rejects with the signal's reason |

## API

| Export | Kind | Purpose |
|---|---|---|
| `TokenVerifier` | class | `verify(token, options?)` |
| `ITokenVerifier` | interface | The `verify(token, options?)` contract the adapters accept |
| `MemoryTokenCache` | class | In-process `ITokenCache` with per-entry TTL (re-exported from vouchly) |
| `RedisTokenCache` | class | Redis-backed `ITokenCache` |
| `ITokenCache`, `TokenCacheEntry` | types | vouchly's cache contract, for a cache of your own |
| `extractBearerToken` | function | Reads the token out of an `Authorization` header value |
| `assertTokenCertificateBinding` | function | The RFC 8705 thumbprint check on its own |
| `TokenVerifierContext`, `TokenVerifyOptions`, `TokenVerificationData` | types | Options and result shapes |

## Notes

- **Local mode does not see revocations.** A token whose session was revoked keeps verifying until it expires, and a disabled signing key keeps verifying until its cache entry expires (5 minutes by default). Use remote mode, or a short `jwkCache.ttl`, where that matters.
- **Errors are `JWTError`s, except a timeout or an abort.** A bad signature, missing claim or wrong kind throws `invalid_token`, an expired token `expired_token`, an inactive one `inactive_token`. In remote mode every other failure is `invalid_token`; the server's own error code is not passed through. A request that ran out of time throws `UpstreamTimeoutError` (`isUpstreamTimeoutError` from `@authup/errors`), and an aborted call rejects with the signal's reason.
- **Results are copies.** `verify` returns a clone, so mutating it never changes a cached entry.
- **Kind-less tokens pass.** Only a present `kind` other than `access_token` is rejected.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
