# Node

The Node server adapter provides middleware for HTTP services built on Node's `IncomingMessage` / `ServerResponse` API
(express, connect, raw `http.createServer`, etc.).

## Installation

Add the package as a dependency to the project.

```sh
npm install @authup/server-adapter-node --save
```

## Middleware

The middleware should be injected at the beginning of the chain.

It validates the Bearer token from the `Authorization` header (or, optionally, from any consumer-supplied source like a cookie),
and calls a handler callback with the verification data (realm, permissions, user/client info, etc.).

The `createMiddleware` method accepts a configuration object with a `tokenVerifier` (from `@authup/server-adapter-kit`)
and a `tokenVerifierHandler` callback. The optional `tokenByRequest` callback lets you fall back to an alternative source
(e.g. a cookie) when the `Authorization` header is missing — the consumer chooses how to extract the value.

For certificate-bound tokens, provide `certificateThumbprintByRequest`. It must
return the base64url SHA-256 thumbprint of the leaf certificate's DER encoding.
A bound token fails verification when the callback is absent, returns no
certificate, or returns a different thumbprint.

With direct Node TLS, one possible resolver is:

```typescript
import { createHash } from 'node:crypto';
import type { TLSSocket } from 'node:tls';

const certificateThumbprintByRequest = (req) => {
    const peer = (req.socket as TLSSocket).getPeerCertificate();
    return peer.raw ? createHash('sha256').update(peer.raw).digest('base64url') : undefined;
};
```

Behind a proxy, derive the value from the proxy's authenticated certificate
contract instead. Never hash an unchecked public header; the proxy must remove
and overwrite it, and the backend listener must be private.

Enforcement lives inside `TokenVerifier.verify()` itself — the middleware only
forwards a lazy thumbprint provider. Calling `verify(token)` directly on a
bound token therefore also fails closed; pass the presented thumbprint via
`verify(token, { certificateThumbprint })`.

```typescript
import { Router } from 'routup';
import { createMiddleware } from '@authup/server-adapter-node';
import { CookieName } from '@authup/core-http-kit';
import { TokenVerifier } from '@authup/server-adapter-kit';

// setup router
const router = new Router();

// create token verifier
const tokenVerifier = new TokenVerifier({
    baseURL: 'http://localhost:3000/',
    creator: {
        type: 'user',
        name: 'admin',
        password: 'start123',
    },
});

// setup middleware
router.use(createMiddleware({
    tokenByRequest: (req) => req.cookies?.[CookieName.ACCESS_TOKEN],
    certificateThumbprintByRequest,
    tokenVerifier,
    tokenVerifierHandler: (req, data) => {
        console.log(data);
        // { sub: 'xxx', realm_id: 'xxx', permissions: [...], ... }
    }
}));

router.listen(3000);
```

::: warning Foreign-token introspection needs a grant
Remote verification introspects tokens that were issued to other clients.
The identity behind `creator` must hold the `token_introspect` permission,
or every foreign token is reported as inactive. Tokens issued to the
creator's own client need no grant.
:::

## verifyRequest primitive

If you need direct control over the response — for example to short-circuit unauthenticated requests with a custom
error body — `verifyRequest` is available as a transport-neutral primitive. It mirrors the
`@authup/server-adapter-web` shape:

```typescript
import { verifyRequest } from '@authup/server-adapter-node';

const data = await verifyRequest(req, { tokenVerifier });
// data is `TokenVerificationData` when a valid Bearer token was present,
// `undefined` when no token was provided, or rejects with `BearerTokenMalformedError`
// (malformed Authorization header) / the underlying verifier error.
```

`createMiddleware` is a thin wrapper around `verifyRequest` that calls your `tokenVerifierHandler` on success
and forwards errors via `next(err)`.
