# Database 

The database sub-modul which depends on the [typeorm]() library,
contains:
- entities (mandatory),
- seeds & 
- subscribers

which can be registered like described in the following sections.

## Entities

All domain entities, which can be managed by the REST-API, must be set for the DataSource.

::: warning Important

It is highly recommend to include the provided [subscribers](#subscribers),
to invalidate the entity cache for example, when caching is enabled.

:::

Therefore, use the utility function `setEntitiesForDataSourceOptions` to extend the typeorm DataSourceOptions.


```typescript
import {
    setEntitiesForDataSourceOptions
} from '@authup/server-core';

import { 
    DataSource,
    DataSourceOptions
} from 'typeorm';

(async () => {
    const options : DataSourceOptions = {
        // ...
    };

    // set entities
    setEntitiesForDataSourceOptions(options);

    // set subscribers
    /* ... */
    
    const dataSource = new DataSource(options);
    await dataSource.initialize();
    
    // run seed
    /* ... */
})();
```

## Seeds

The `DatabaseSeeder` class populates the database with an initial data set (user, role, ...):
- User: admin
- Role: admin
- Permission(s): user_add, user_edit, ...

It also creates all possible relations between the following entities:
- user - role
- role - permissions

```typescript
import {
    DatabaseSeeder,
    extendDataSourceOptions
} from '@authup/server-core';

import {
    DataSource,
    DataSourceOptions
} from 'typeorm';

(async () => {
    const options : DataSourceOptions = {
        // ...
    };

    // set entities
    /* ... */

    // set subscribers
    /* ... */

    const dataSource = new DataSource(options);
    await dataSource.initialize();

    // run seed
    const seeder = new DatabaseSeeder();
    
    await seeder.run(connection);
})();
```

## Subscribers

To set the provided providers for the typeorm DataSourceOptions, use the method
`setEntitiesForDataSourceOptions`.

```typescript
import {
    setSubscribersForDataSourceOptions
} from '@authup/server-core';

import { 
    DataSource,
    DataSourceOptions
} from 'typeorm';

(async () => {
    const options : DataSourceOptions = {
        // ...
    };

    // set entities
    /* ... */

    // set subscribers
    setSubscribersForDataSourceOptions(options);

    const dataSource = new DataSource(options);
    await dataSource.initialize();

    // run seed
    /* ... */
})();
```
