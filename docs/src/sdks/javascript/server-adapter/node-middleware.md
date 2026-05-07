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
and calls a handler callback with the verification data (realm, permissions, user/robot info, etc.).

The `createMiddleware` method accepts a configuration object with a `tokenVerifier` (from `@authup/server-adapter-kit`)
and a `tokenVerifierHandler` callback. The optional `tokenByRequest` callback lets you fall back to an alternative source
(e.g. a cookie) when the `Authorization` header is missing — the consumer chooses how to extract the value.

```typescript
import { Router } from 'routup';
import { createMiddleware } from '@authup/server-adapter-node';
import { CookieName } from '@authup/core-http-kit';
import { TokenVerifier } from '@authup/server-adapter-kit';

// setup router
const router = new Router();

// create token verifier
const tokenVerifier = new TokenVerifier({
    baseURL: 'http://localhost:3001/',
    creator: {
        type: 'user',
        name: 'admin',
        password: 'start123',
    },
});

// setup middleware
router.use(createMiddleware({
    tokenByRequest: (req) => req.cookies?.[CookieName.ACCESS_TOKEN],
    tokenVerifier,
    tokenVerifierHandler: (req, data) => {
        console.log(data);
        // { sub: 'xxx', realm_id: 'xxx', permissions: [...], ... }
    }
}));

router.listen(3000);
```

For more details check out, the [API Reference]().
