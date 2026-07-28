# API Client

The `Client` class provides an easy way to interact with the REST-API to manage domain resources.

## Configuration

To configure the API Client, the `baseURL` parameter for the driver config of the constructor should be set.

```typescript
import { Client } from '@authup/core-http-kit';

const client = new Client({
    baseURL: 'http://127.0.0.1:3001/'
});
```

## Domains

The `Client` exposes the following sub-API clients as instance properties:

| Property | API Class | Description |
|---|---|---|
| `token` | `OAuth2TokenAPI` | OAuth2 token operations |
| `authorize` | `OAuth2AuthorizeAPI` | OAuth2 authorization |
| `client` | `ClientAPI` | Client management |
| `clientPermission` | `ClientPermissionAPI` | Client-permission associations |
| `clientRole` | `ClientRoleAPI` | Client-role associations |
| `clientScope` | `ClientScopeAPI` | Client-scope associations |
| `identityProvider` | `IdentityProviderAPI` | Identity provider management |
| `identityProviderRoleMapping` | `IdentityProviderRoleMappingAPI` | Identity provider role mappings |
| `policy` | `PolicyAPI` | Policy management |
| `permission` | `PermissionAPI` | Permission management |
| `realm` | `RealmAPI` | Realm management |
| `role` | `RoleAPI` | Role management |
| `roleAttribute` | `RoleAttributeAPI` | Role attribute management |
| `rolePermission` | `RolePermissionAPI` | Role-permission associations |
| `scope` | `ScopeAPI` | Scope management |
| `user` | `UserAPI` | User management |
| `userInfo` | `OAuth2UserInfoAPI` | OAuth2 user info |
| `userAttribute` | `UserAttributeAPI` | User attribute management |
| `userPermission` | `UserPermissionAPI` | User-permission associations |
| `userRole` | `UserRoleAPI` | User-role associations |

Each property is named after the domain in `camelCase`.

For example:

```typescript
import { Client } from '@authup/core-http-kit';

const client = new Client(/* ... */);

const response = await client.realm.create({
    name: 'Test Realm'
});

console.log(response);
// { id: 'xxx', name: 'Test Realm', ... }
```

## Request & Responses

Nearly each domain API (e.g. `UserAPI`) exposes the same CRUD methods with few exceptions.
The most common methods are:
- `getOne`
- `getMany`
- `create`
- `update`
- `delete`

The response of a resource collection request always returns meta information about how many items (`total`) are available for the given
predicate(s) and which part of the data set is returned (`limit` & `offset`).

```typescript
import { Client } from '@authup/core-http-kit';

const client = new Client({
    /* ... */
});

const response = await client.role.getMany({
    page: {
        limit: 10,
        offset: 0
    }
});

console.log(response);
// {
//      meta: {total: 1, limit: 10, offset: 0},
//      data: [{id: 'xxx', name: 'admin', description: null}],
// }
```

The response of a single resource request mirrors that shape: the resource object under `data`,
response-scoped extras under `meta`.

```typescript
import { Client } from '@authup/core-http-kit';

const client = new Client({
    /* ... */
});

const response = await client.role.getOne('xxxx-xxxx-xxxx-xxxx');

console.log(response);
// {
//     data: {id: 'xxx', name: 'admin', description: null},
//     meta: { schema: { /* ... */ } },
// }
```

## Query Capability Discovery

Every query-capable `GET` describes its own queryable vocabulary under
`meta.schema` — which `filter`, `fields`, `sort` and `include` keys the
endpoint accepts, plus the pagination cap — so a consumer never has to
inspect server source to build a query:

```typescript
const { meta } = await client.role.getMany();

console.log(meta.schema);
// {
//     name: 'role',
//     strict: false,
//     fields: { default: null, allowed: ['id', 'name', /* ... */] },
//     filters: { allowed: ['id', 'name', /* ... */] },
//     sort: { allowed: ['id', 'name', /* ... */], default: null },
//     pagination: { maxLimit: 50 },
//     relations: { allowed: ['realm'], schemas: { realm: 'realm' } },
// }
```

Reading rules:

- the shape is **normalized** — every described parameter carries every
  constraint key: a **`null`** constraint was never declared (no explicit
  allow-list); an **empty array** is an explicit "nothing allowed".
- relation vocabulary is **referenced, not expanded**: `relations.schemas`
  names the schema governing each relation — dotted keys like
  `filter[client.id]` follow the `client` entity's own description, found
  on its own endpoints.
- single-record `GET`s carry the subset a record read processes
  (`fields` + `relations` only).
- the description is the **static upper bound** — actor-dependent
  authorization gates may still strip individual keys per request.

