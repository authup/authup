# Testing

The `@authup/core-http-kit/testing` subpath ships a fake API client for tests:
a `Client` subclass whose `request()` method is short-circuited by a handler map,
so no call ever touches the network. Production code must never import from this
subpath.

## Fake Client

```typescript
import { createFakeClient } from '@authup/core-http-kit/testing';

const client = createFakeClient({
    handlers: {
        'GET /clients/:id': ({ params }) => ({ data: { id: params.id, name: 'demo' }, meta: {} }),
        'GET /realms': () => ({ data: [{ name: 'master' }], meta: { total: 1 } }),
        '*': () => ({ data: [], meta: { total: 0 } }),
    },
});

// the full resource API surface works against the handlers:
const response = await client.client.getOne('abc'); // { data: { id: 'abc', name: 'demo' }, meta: {} }
```

### Handler map

| Key | Meaning |
|---|---|
| `'GET /clients/:id'` | Method + path pattern. `:param` segments capture into `req.params`. |
| `'*'` | Catch-all, used when no pattern matches. |

Handlers receive `{ method, url, body, params }` and may be async. Query strings
are ignored for matching. When neither a pattern nor `'*'` matches, the `fallback`
option is invoked (default: an empty collection response,
`{ data: [], meta: { total: 0 } }`).

Every dispatched request is recorded on `client.requests` (in order), for
call-shape assertions.

### Caveats

- The default fallback returns a **collection** shape. Endpoints with another
  wire shape — the `{ data, meta }` record envelope, token payloads (e.g.
  session resolution) — need explicit handlers, or the consuming code will
  see a misshapen value.
- A throwing handler rejects the in-flight request. For code paths that fire
  requests without awaiting them (fire-and-forget), this surfaces as an
  unhandled rejection — only throw in handlers exercised by awaited flows.

## Injection via `install()`

`@authup/client-web-kit`'s `install()` accepts a pre-built `httpClient`. It is
used instead of constructing one from `baseURL` — by the provided client, the
session store, and the authentication hook alike:

```typescript
import { install } from '@authup/client-web-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';

install(app, {
    baseURL: 'http://localhost:3000',
    httpClient: createFakeClient({ handlers: { /* ... */ } }),
    pinia,
});
```

The option is not test-only: any pre-configured `Client` (custom retry policy,
internal network base URL) can be injected the same way. The authentication
hook (token refresh on 401) is attached to injected clients too — it is simply
inert on a fake that never produces error responses.
