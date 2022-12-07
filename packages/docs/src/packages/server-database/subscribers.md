# Subscribers

To set the provided providers for the typeorm DataSourceOptions, use the method
`setEntitiesForDataSourceOptions`.

```typescript
import {
    setSubscribersForDataSourceOptions
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
    setSubscribersForDataSourceOptions(options);

    const dataSource = new DataSource(options);
    await dataSource.initialize();

    // run seed
    /* ... */
})();
```
