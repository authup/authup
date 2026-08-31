# @authup/server-adapter-web 🌉

[![npm version](https://badge.fury.io/js/@authup%2Fserver-adapter-web.svg)](https://badge.fury.io/js/@authup%2Fserver-adapter-web)
[![main](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/authup/authup/badge.svg)](https://snyk.io/test/github/authup/authup)

A transport-neutral Web `Request` adapter primitive for authup.
Wrap it with whatever framework middleware shape you use (routup v5, Hono, Elysia, Bun.serve, ...).

**Table of Contents**

- [Usage](#usage)
- [Documentation](#documentation)
- [License](#license)

## Usage

The package exposes a single primitive, `verifyRequest(request, options)`, that takes a Web `Request`
and returns the verification data, `undefined` (no token), or throws on a malformed `Authorization`
header / verifier rejection.

```typescript
import { verifyRequest } from '@authup/server-adapter-web';
import { TokenVerifier } from '@authup/server-adapter-kit';

const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3000/' });

// routup v5
router.use(async (event) => {
    const data = await verifyRequest(event.request, { tokenVerifier });
    if (data) event.context.identity = data;
});

// Hono
app.use('*', async (c, next) => {
    const data = await verifyRequest(c.req.raw, { tokenVerifier });
    if (data) c.set('identity', data);
    await next();
});
```

The optional `tokenByRequest` callback is invoked when no `Authorization` header is present — the consumer
chooses what fallback source to read (cookie, custom header, query string) and the adapter does not parse
cookies on its own.

## Documentation

To read the docs, visit [https://authup.org/](https://authup.org/)

## License

Made with 💚

Published under [Apache 2.0 License](./LICENSE).
