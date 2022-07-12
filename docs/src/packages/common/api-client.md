# API Interaction

The APIClient Class provides an easy way to interact with api domain resources, 
which are available by using the [api](../api/index.md) or [api-core](../api-core/index.md) package.

## Configuration

To configure the API Client, the `baseURL` parameter for the driver config of the constructor should be set.


```typescript
import { APIClient } from '@authelion/common';

const client = new APIClient({
    driver: {
        baseURL: 'http://127.0.0.1:3010/'
    }
});
```

## Domains

The API-Client provides the following domain clients, which are accessible by the respective
instance property.

The following domain APIs with the corresponding property name exist:
- OAuth2ProviderAPI: `oauth2Provider`
- OAuth2ProviderRoleAPI: `oauth2ProviderRole`
- PermissionAPI: `permission`
- RealmAPI: `realm`
- RobotAPI: `robot`
- RobotPermissionAPI: `robotPermission`
- RobotRoleAPI: `robotRole`
- RoleAPI: `role`
- RoleAttributeAPI: `roleAttribute`
- RolePermissionAPI: `rolePermission`
- TokenAPI: `token`
- UserAPI: `user`
- UserAttributeAPI: `userAttribute`
- UserPermissionAPI: `userPermission`
- UserRoleAPI: `userRole`

## Request & Responses

Nearly each domain API (e.g. UserAPI) expose the same CRUD methods with few exceptions.
The most common methods are: 
- `getOne`
- `getMany`
- `create`
- `update`
- `delete`

The response of a resource collection request always return meta information about how many items (`total`) are available for the given
predicate(s) and which part of data set is returned (`limit` & `offset`).

```typescript
import { APIClient } from '@authelion/common';

const client = new APIClient({
    /* ... */
})

(async () => {
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
})();
```

The response of a single resource request always return the resource object **without** meta information.

```typescript
import { APIClient } from '@authelion/common';

const client = new APIClient({
    /* ... */
})

(async () => {
    const response = await client.role.getOne('xxxx-xxxx-xxxx-xxxx');
    
    console.log(response);
    // {
    //     id: 'xxx', name: 'admin', description: null
    // }
})();
```

## Errors

Depending on the payload, the request might not be successfully. In that case,
the api responds with an error payload, which looks like this:

::: warning Important

The response maybe differs if the [api-core](../api-core/index.md) package is **not** used with the provided error middleware.

:::

```json
{
    "message": "The application could not fulfill the request",
    "code": "bad_request",
    "statusCode": 400
}
```

The error codes can be used to handle each error separately. Check out the [Api Reference]() for available error codes.


