# API Client

The APIClient Class provides an easy way to interact with the REST-API to manage domain resources.
## Configuration

To configure the API Client, the `baseURL` parameter for the driver config of the constructor should be set.


```typescript
import { Client } from '@authup/core-http-kit';

const client = new Client({
    baseURL: 'http://127.0.0.1:3010/'
});
```

## Domains

The API-Client provides the following domain clients, which are accessible by the respective
instance property.

The instance property is named after the APIClient name in `camelCase`.

For example:

**Realm**: realm

```typescript
import { Client } from '@authup/core-http-kit';

const client = new Client(/* ... */);

(async () => {
    const response = await client.realm.create({
        name: 'Test Realm'
    });

    console.log(response);
    // { id: 'xxx', name: 'Test Realm', ... }
})();

```

Checkout the [domain](../core-kit/api-reference) section for available APIClients.

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
import { APIClient } from '@authup/core';

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
import { APIClient } from '@authup/core';

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


