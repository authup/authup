<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/core-http-kit</h1>

<p align="center">
    <b>Typed HTTP client for the Authup API, with a hook that obtains and refreshes tokens.</b><br>
    You stop hand-writing fetch calls, query strings and token renewal against an Authup server.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/core-http-kit"><img src="https://img.shields.io/npm/v/@authup/core-http-kit" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why @authup/core-http-kit?

Authup's management API and its OAuth2 endpoints are plain HTTP, so any client works. What you would otherwise write yourself is the part around the request: the URL per entity, the rapiq query string, the `{ data, meta }` response shape, the token grant, and the retry when the token expired.

| Concern | Without it | With it |
|---|---|---|
| **Endpoints** | A URL and a response type per call | `client.user.getMany()`, `client.role.create()`, ... one sub-API per entity, typed with the domain types from `@authup/core-kit` |
| **Queries** | Encoding `filter`, `sort`, `fields`, `include` and `page` by hand | Pass `filters`, `sorts`, `fields`, `relations`, `pagination`; it is serialized for you |
| **Tokens** | Calling `/token`, storing the token, setting the header | `client.token.createWithPassword()` and siblings, plus `ClientAuthenticationHook` |
| **Expiry** | Catching a `401`, renewing, replaying | The hook renews on a `401` or a token error and replays the request once |
| **Tests** | Mocking `fetch` | `createFakeClient()` from `@authup/core-http-kit/testing` answers by route |

## Installation

```shell
npm install @authup/core-http-kit
```

ESM only. Node.js `>=26.0.0`, or any browser with `fetch`. There are no peer dependencies.

## Usage

### Create a client

```typescript
import { Client } from '@authup/core-http-kit';

const client = new Client({ baseURL: 'https://auth.example.com' });

const { data: users, meta } = await client.user.getMany({
    filters: { realmId: '<realm id>' },
    sorts: { name: 'ASC' },
    pagination: { limit: 20 },
});
// meta.total, meta.schema

const { data: user } = await client.user.getOne(users[0].id);
```

- `baseURL` has no default: `Client` sends relative URLs unless you set it. `API_URL_DEFAULT` (`http://localhost:3001`) is exported for callers that want a fallback.
- A collection read answers `{ data: T[], meta: { total, limit?, offset?, schema? } }`. A record read and every write answer `{ data: T, meta }`.
- The query takes `filters`, `sorts`, `fields`, `relations` and `pagination`, or an already assembled rapiq `IQuery` (for example one built with `and()` / `or()` from `@rapiq/core`). The server drops whatever the entity's schema does not allow; `meta.schema` lists what it does.

### Entity APIs

Every entity has a sub-API on the client. Most carry the same verbs:

| Verb | Request |
|---|---|
| `getMany(query?)` | `GET /<collection>` |
| `getOne(id, query?)` | `GET /<collection>/:id` |
| `create(data)` | `POST /<collection>` |
| `update(id, data)` | `POST /<collection>/:id` |
| `createOrUpdate(idOrName, data)` | `PUT /<collection>/:idOrName` (realm, client, role, scope, user, permission, identity provider) |
| `delete(id)` | `DELETE /<collection>/:id` |
| `getStats(query?)` | `GET /<collection>/@stats`, grouped counts (realm, client, scope, identity provider, key, trust anchor, user, path, role, policy, permission, session, event) |
| `getSchema()` | `GET /<collection>/@schema`, the queryable vocabulary (every entity API except `userAuthenticator`) |

Not every entity offers every verb: events are read-only, sessions and session tokens are read and delete only (plus `deleteMany`), junctions such as `userRole` or `clientScope` carry no `update`. A few carry extras, for example `client.client.rotateSecret(id, payload?)`, `client.session.deleteMany(query?)` and `client.realm.getOne(id)`, whose `meta.endpoints` holds the realm's `issuer`, `openidConfiguration` and `jwks` URLs.

To pick a sub-API by entity type string, use `pickEntityAPI`. Every verb is optional on the result, so guard per method:

```typescript
import { EntityType } from '@authup/core-kit';
import { pickEntityAPI } from '@authup/core-http-kit';

const api = pickEntityAPI(client, EntityType.ROLE);
if (api && api.getMany) {
    const { data: roles } = await api.getMany({ pagination: { limit: 10 } });
}
```

### Obtain a token

`client.token` wraps the `/token` endpoint:

```typescript
const grant = await client.token.createWithPassword({
    username: 'admin',
    password: 'start123',
    realm_name: 'master',
});

client.setAuthorizationHeader({ type: 'Bearer', token: grant.access_token });
```

| Method | Grant |
|---|---|
| `createWithPassword({ username, password, otp?, realm_id?, realm_name? })` | `password` |
| `createWithClientCredentials({ client_id, client_secret })` | `client_credentials` |
| `createWithRefreshToken({ refresh_token })` | `refresh_token` |
| `createWithAuthorizationCode({ code, redirect_uri, code_verifier? })` | `authorization_code` |
| `createWithDeviceCode({ device_code, client_id? })` | `urn:ietf:params:oauth:grant-type:device_code` |
| `introspect({ token })` | `POST /token/introspect` |
| `revoke({ token })` | `POST /token/revoke` |

A user holding a second factor adds `otp` (a TOTP or recovery code) to the password grant.

### Keep a token fresh

`ClientAuthenticationHook` attaches to one or more clients and gets a token when the server asks for one:

```typescript
import { Client, ClientAuthenticationHook, createClientTokenCreator } from '@authup/core-http-kit';

const client = new Client({ baseURL: 'https://auth.example.com' });

const hook = new ClientAuthenticationHook({
    tokenCreator: createClientTokenCreator(
        { id: '<client id>', secret: '<client secret>' },
        { client: { baseURL: 'https://auth.example.com' } },
    ),
});
hook.attach(client);
```

- The hook does not fetch a token up front. The first request goes out without one; a `401` (or a token error code in the body) calls `tokenCreator`, sets `Authorization: Bearer` on every attached client and replays the request once.
- Concurrent failures share one `tokenCreator` call.
- With `timer` (on by default) it renews again 60 seconds before `expires_in` runs out.
- A key error (`JWK_*` code) unsets the header and rejects without renewing; a failed renewal unsets it as well.
- `createUserTokenCreator({ name, password, realmId?, realmName? }, { client })` is the password-grant counterpart. You can pass any `() => Promise<OAuth2TokenGrantResponse>` instead.
- The hook emits `refreshFinished`, `refreshFailed`, `headerSet` and `headerRemoved` (`ClientAuthenticationHookEventName`).

### Device authorization

A device without a browser asks for a code, shows it, and polls:

```typescript
import { isClientError } from '@authup/core-http-kit';

const device = await client.deviceAuthorization.create({ client_id: '<client id>', scope: 'openid' });
console.log(`Open ${device.verification_uri_complete}`);

async function poll(interval: number) {
    await new Promise((resolve) => { setTimeout(resolve, interval * 1000); });
    try {
        return await client.token.createWithDeviceCode({
            device_code: device.device_code,
            client_id: '<client id>',
        });
    } catch (e) {
        const error = isClientError(e) ? e.response?.data?.error : undefined;
        if (error === 'authorization_pending') return poll(interval);
        if (error === 'slow_down') return poll(interval + 5);
        throw e;
    }
}

const grant = await poll(device.interval);
```

`client.deviceAuthorization.lookup / approve / deny({ user_code })` are the calls of the page that approves the code; they ride the client's own bearer.

### Check permissions

`client.authorization.check()` asks the server which permissions the caller holds, and in which realms:

```typescript
const permissions = await client.authorization.check({ names: ['user_read', 'user_update'] });
const canUpdate = permissions.some((permission) => permission.name === 'user_update');
```

- Omit `names` to check every permission. `realms` and `clients` pick which definitions are evaluated by the realm and client that own them; both default to `[null]` (definitions owned by no realm and no client). Pass `own` (your realm, or the client your token was issued to), `ownOrNull` (plus unowned), `granted` (plus the owner of every definition you hold a grant of) or a list of ids (`null` for unowned).
- `targetRealms` picks the resource realms each definition is checked against. It defaults to `ownOrNull` (the caller's realm plus global rows); pass `own` or a list of realm ids (`null` for global).
- Each entry carries `name`, the owning `realmId` / `clientId` (omitted when null) and the `targetRealms` it holds in. Only definitions the caller holds in at least one requested target realm appear, so absent means denied.
- `checkWithMaxAge()` also returns `maxAge`, the seconds until a date or time policy could change the answer.
- `client.authorization.get()` reads the identity-free permission catalog instead. It needs one of `permission_read`, `permission_update` or `permission_delete`.

### Testing

```typescript
import { createFakeClient } from '@authup/core-http-kit/testing';

const fake = createFakeClient({
    handlers: {
        'GET /users/:id': (req) => ({ data: { id: req.params.id, name: 'alice' }, meta: {} }),
    },
});

const { data } = await fake.user.getOne('1');
// fake.requests lists every request: method, url, body, params, headers
```

- Handler keys are `'<METHOD> <path>'` with `:param` segments, or `'*'` as a catch-all.
- An unmatched request answers `fallback`, by default `{ data: [], meta: { total: 0 } }`. `baseURL` defaults to `http://fake.test`.
- A urlencoded body (token requests) is recorded as a plain object.

## Options

`ClientAuthenticationHookOptions`:

| Option | Type | Default | Description |
|---|---|---|---|
| `tokenCreator` | `() => Promise<OAuth2TokenGrantResponse>` | required | Called when a token is needed |
| `timer` | `boolean` | `true` | Renew 60 seconds before the token expires |
| `baseURL` | `string` | | Accepted for compatibility; the hook does not read it |

`Client` takes hapic's client options (`baseURL`, `headers`, ...).

## API

| Export | Kind | Purpose |
|---|---|---|
| `Client`, `IClient` | class, interface | The HTTP client and its contract, with one sub-API per entity and workflow |
| `ClientAuthenticationHook` | class | Obtains, renews and applies tokens for attached clients |
| `ClientAuthenticationHookEventName` | enum | Events the hook emits |
| `createClientTokenCreator`, `createUserTokenCreator` | function | Token creators for the client-credentials and password grants |
| `TokenCreator` | type | `() => Promise<OAuth2TokenGrantResponse>` |
| `pickEntityAPI` | function | Resolve a sub-API by `EntityType` string |
| `EntityAPIDispatch`, `ClientEntityAPIKey` | type | The per-verb optional surface `pickEntityAPI` returns, and the keys it accepts |
| `EntityRecordResponse`, `EntityCollectionResponse` | type | The `{ data, meta }` response shapes |
| `EntityStatsQuery`, `EntityStatsResponse`, `buildStatsURL` | type, function | The `@stats` read |
| `EntityQueryInput`, `buildQueryString` | type, function | The query input of every read and its URL serialization |
| `UserAPI`, `RoleAPI`, `OAuth2TokenAPI`, `AuthorizationAPI`, ... | class | The sub-APIs, each with an `I*API` interface and `*CreatePayload` / `*UpdatePayload` types |
| `AuthorizeInfo`, `ClientSummary`, `RealmSummary`, `StatusResponse` | type | Workflow response shapes |
| `isClientError`, `getClientErrorCode` | function | Detect a hapic `ClientError` and read its `code` |
| `setHeader`, `unsetHeader` | function | Header helpers re-exported from hapic |
| `CookieName` | enum | The cookie names the Authup web kit stores tokens under |
| `API_URL_DEFAULT` | const | `http://localhost:3001` |

`@authup/core-http-kit/testing` exports `FakeClient`, `createFakeClient`, `matchRoute` and the `Fake*` types.

## Notes

- **Token calls drop the client's own `Authorization` header.** `client.token.*` and `client.deviceAuthorization.create` remove the header the client carries, so client credentials in the body are never mixed with a bearer. Pass `{ authorizationHeaderInherit: true }` (or `{ authorizationHeader }`) as the second argument to send one, for example to introspect with your own credential: `client.token.introspect({ token }, { authorizationHeaderInherit: true })`.
- **Error messages come from the server.** On a failed request the client replaces the error's `message` with the body's `message` when it has one, so the URL is not in it any more.
- **A refresh is retried once per request.** If the replayed request fails again, its error reaches you.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
