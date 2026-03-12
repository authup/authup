# Seeds

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
} from '@authup/server-database';

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
