# Testing

When you write component or SSR tests for a Vue app that uses `@authup/client-web-kit`,
the components reach the network through an injected HTTP client.
Letting that client hit a real server during tests is brittle (timing,
fixtures, parallel-run port collisions) and impossible during SSR-time
unit tests where no server is running.

The kit exposes an `httpClient` option on `install()` that overrides the
auto-constructed client. Combined with the `createFakeClient(handlers)`
helper from `@authup/core-http-kit/testing`, you can build a fully
controlled, network-free test environment.

::: warning Availability
The `httpClient` option on `install()` and the `@authup/core-http-kit/testing`
subpath ship together. If your installed version pre-dates that release,
update both packages to the same version.
:::

## A minimal example

```ts
import { install } from '@authup/client-web-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';

const httpClient = createFakeClient({
    handlers: {
        // Match by `'<METHOD> <path>'`. `:param` segments are extracted.
        'GET /clients/:id': ({ params }) => ({
            id: params.id,
            name: 'Test Client',
            redirect_uri: 'https://example.com/cb',
        }),
        'GET /scopes': () => ({ data: [], meta: { total: 0 } }),
        'GET /users/@me': () => ({ id: 'anon', name: 'anon' }),
        // Catch-all — any unmatched request gets an empty paginated payload.
        '*': () => ({ data: [], meta: { total: 0 } }),
    },
});

const app = createSSRApp(/* ... */);

install(app, {
    baseURL: 'http://example.test',
    pinia: createPinia(),
    httpClient,
});
```

The fake never opens a socket. Each `client.client.getOne('abc-123')`
call inside your components resolves to the canned response from the
matching handler.

## Handler shape

```ts
type FakeHandler = (req: {
    method: string;
    url: string;
    body?: unknown;
    params: Record<string, string>;
}) => unknown | Promise<unknown>;
```

The return value is wrapped in the same `{ data: ... }` envelope that
the real `Client` returns. Resource APIs in `@authup/core-http-kit`
(e.g. `client.client`, `client.scope`, `client.user`) consume that
envelope unchanged, so handlers return the same shape your real
endpoints return.

## Patterns

- **Route key**: `'GET /path'` — exact match.
- **Path param**: `'GET /clients/:id'` — `:id` is extracted into `params.id`.
- **Catch-all**: `'*'` — matched after all other entries; useful for asserting that
  no unexpected request reaches the wire while still satisfying every fetch with
  an empty payload.
- **Async**: a handler may return a `Promise`.

## Production safety

`@authup/core-http-kit/testing` is a separate subpath export. Production
bundles import from `@authup/core-http-kit` and do not pull in any of the
fake's code. Treat any production import of `…/testing` as a build error.
