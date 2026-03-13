# HTTP

The HTTP server adapter provides middleware for HTTP based services.

## Installation

Add the package as a dependency to the project.

```sh
npm install @authup/server-adapter-http --save
```

## Middleware

The HTTP middleware should be injected at the beginning of the chain.

The middleware validates the Bearer token from the `Authorization` header (or from a cookie).
It calls a handler callback with the verification data (realm, permissions, user/robot info, etc.).

The `createMiddleware` method accepts a configuration object with a `tokenVerifier` (from `@authup/server-adapter-kit`)
and a `tokenVerifierHandler` callback.

```typescript
import { Router } from 'routup';
import { createMiddleware } from '@authup/server-adapter-http';
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

// setup http middleware
router.use(createMiddleware({
    tokenByCookie: (req, cookieName) => req.cookies[cookieName],
    tokenVerifier,
    tokenVerifierHandler: (req, data) => {
        console.log(data);
        // { sub: 'xxx', realm_id: 'xxx', permissions: [...], ... }
    }
}));

router.listen(3000);
```

For more details check out, the [API Reference]().
