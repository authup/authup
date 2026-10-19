# Web

The Web server adapter provides a transport-neutral primitive for HTTP services that operate on the standard
`Request` object (routup v5, Hono, Elysia, Bun.serve, raw Web `fetch` handlers, ...).

It does **not** ship a middleware factory. The package exposes a single `verifyRequest(request, options)` helper.
Your handler decides what to do with the result.

## Installation

Add the package as a dependency to the project.

```sh
npm install @authup/server-adapter-web --save
```

## verifyRequest

```typescript
import { verifyRequest } from '@authup/server-adapter-web';
import { TokenVerifier } from '@authup/server-adapter-kit';

const tokenVerifier = new TokenVerifier({
    baseURL: 'http://localhost:3000/',
    creator: {
        type: 'user',
        name: 'admin',
        password: 'start123',
    },
});
```

::: warning Foreign-token introspection needs a grant
Remote verification introspects tokens that were issued to other clients.
The identity behind `creator` must hold the `token_introspect` permission,
or every foreign token is reported as inactive. Tokens issued to the
creator's own client need no grant.
:::

Contract:

| Header / fallback state              | Result                                         |
|--------------------------------------|------------------------------------------------|
| No `Authorization` and no fallback   | resolves with `undefined`                      |
| Valid `Bearer <token>` and verify ok | resolves with `TokenVerificationData`          |
| Malformed `Authorization` header     | rejects with `BearerTokenMalformedError`       |
| `tokenVerifier.verify` rejects       | rejects with the underlying verifier error     |

The optional `tokenByRequest` callback runs only when the `Authorization` header is absent. The consumer
extracts the token from wherever they like (cookie, custom header, query string): the adapter does not parse cookies.

## Key caching

Local verification (no `creator`) caches each signing key per realm and key id for 5 minutes, in
process memory whatever token `cache` is set, since a `CryptoKey` cannot be serialized. An unknown key id is always fetched and failed fetches are never cached, so a key rotation needs
no restart, and a disabled or deleted key keeps verifying for at most the TTL. Concurrent lookups of one
key share a single fetch, which fails after 10 seconds (`timeout`) so a stalled request to the auth server
cannot hold up later verifications. Tune or disable the cache on the `TokenVerifier`:

```typescript
const tokenVerifier = new TokenVerifier({
    baseURL: 'http://localhost:3000/',
    jwkCache: { ttl: 600, timeout: 5 },
});

// fetch the signing key for every verification
const uncachedVerifier = new TokenVerifier({
    baseURL: 'http://localhost:3000/',
    jwkCache: false,
});
```

## Token caching

A `TokenVerifier` verifies every request anew unless you pass a `cache`. With one, each result is
kept until the token expires and served without asking authup again, so it outlives a disabled
signing key (local verification) or a revoked token (remote verification, with `creator`).
`maxRemoteCacheTTL` bounds how long an introspection answer is kept. Pass a `MemoryTokenCache`
for one process, or a `RedisTokenCache` to share results between processes:

```typescript
import { RedisTokenCache, TokenVerifier } from '@authup/server-adapter-kit';

const tokenVerifier = new TokenVerifier({
    baseURL: 'http://localhost:3000/',
    cache: new RedisTokenCache('redis://127.0.0.1:6379'),
});
```

Entries of a cache passed in are kept under a namespace, by default `authup:local:<baseURL>` or
`authup:remote:<baseURL>`, so a local and a remote verifier of one deployment never answer with each
other's results. Verifiers sharing a `cacheNamespace` must be configured identically.

Remote verification introspects with the token `creator` mints and keeps it until authup answers
`401`; it then mints a new one and asks once more. An inactive token is rejected with
`inactive_token`, a failed introspection with `invalid_token` naming the status authup answered.

## Certificate-bound tokens

If verification returns a token with `cnf.x5t#S256`, `verifyRequest` fails
closed unless `certificateThumbprintByRequest` returns the same base64url
SHA-256 thumbprint of the leaf certificate's DER encoding:

```typescript
const data = await verifyRequest(request, {
    tokenVerifier,
    certificateThumbprintByRequest: (request) =>
        trustedProxyCertificateThumbprint(request),
});
```

The callback is the application's TLS/proxy trust boundary. Derive its result
from a direct TLS connection or a header that a trusted private proxy always
removes and overwrites; do not return an unchecked public request header. The
adapter compares the thumbprint only and deliberately does not repeat the
authorization server's certificate-chain validation.

Enforcement lives inside `TokenVerifier.verify()` itself: the helper only
forwards a lazy thumbprint provider. Calling `verify(token)` directly on a
bound token therefore also fails closed; pass the presented thumbprint via
`verify(token, { certificateThumbprint })` (a value or a provider, invoked
only when the token carries a `cnf` binding).

## Routup v5

```typescript
import { verifyRequest } from '@authup/server-adapter-web';
import { useCookie } from '@routup/basic/cookie';
import { CookieName } from '@authup/core-http-kit';

router.use(async (event) => {
    const data = await verifyRequest(event.request, {
        tokenVerifier,
        tokenByRequest: () => useCookie(event, CookieName.ACCESS_TOKEN),
    });
    if (data) {
        event.context.identity = data;
    }
});
```

## Hono

```typescript
import { verifyRequest } from '@authup/server-adapter-web';
import { getCookie } from 'hono/cookie';
import { CookieName } from '@authup/core-http-kit';

app.use('*', async (c, next) => {
    const data = await verifyRequest(c.req.raw, {
        tokenVerifier,
        tokenByRequest: () => getCookie(c, CookieName.ACCESS_TOKEN),
    });
    if (data) {
        c.set('identity', data);
    }
    await next();
});
```
