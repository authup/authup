# API Client

The `Client` class provides an easy way to interact with the REST-API to manage domain resources.

## Configuration

To configure the API Client, the `baseURL` parameter for the driver config of the constructor should be set.

```typescript
import { Client } from '@authup/core-http-kit';

const client = new Client({
    baseURL: 'http://127.0.0.1:3010/'
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
| `robot` | `RobotAPI` | Robot management |
| `robotPermission` | `RobotPermissionAPI` | Robot-permission associations |
| `robotRole` | `RobotRoleAPI` | Robot-role associations |
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

The response of a single resource request always returns the resource object **without** meta information.

```typescript
import { Client } from '@authup/core-http-kit';

const client = new Client({
    /* ... */
});

const response = await client.role.getOne('xxxx-xxxx-xxxx-xxxx');

console.log(response);
// {
//     id: 'xxx', name: 'admin', description: null
// }
```
