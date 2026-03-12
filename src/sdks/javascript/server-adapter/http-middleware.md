# HTTP

The http server plugin provides utilities for http based services.

## Installation

Add the package as a dependency to the project.

```sh
npm install @authup/server-core-plugin-http --save
```

## Middleware

The http middleware should be injected at the beginning of the chain.

The middleware is used to validate the bearer token by authorization header (or by cookie).
It calls a callback function with general information (realm, abilities, ...) and information about the corresponding robot or user of the token.

The `createMiddleware` method, accepts a configuration object.
The redis client, if enabled, is used to cache verification responses from the backend service.

```typescript
import { Router } from 'routup';
import { createMiddleware } from '@authup/server-core-plugin-http';
import { createClient } from 'redis-extension';

// setup router
const router = new Router();

// setup socket middleware for socket server
router.use(createMiddleware({
    tokenByCookie: (req, cookieName) => req.cookies[cookieName],
    tokenVerifier: {
        baseURL: 'http://localhost:3001/',
        creator: {
            type: 'user',
            name: 'admin',
            password: 'start123',
        },
        cache: {
            type: 'redis',
            client: createClient({ connectionString: 'redis://127.0.0.1' })
        }
    },
    tokenVerifierHandler: (req, data) => {
        console.log(data);
        // { 'realmId': 'xxx', userId: 'xxx', userName: 'xxx', ... }
    }
    /* ... */
}));

router.listen(3000);
```

For more details check out, the [API Reference]().
