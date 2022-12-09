# OAuth2

## Cleaner
OAuth2 tokens which are used to handle authentication & authorization
are stored in the database and cached in redis.
But it is necessary to remove the corresponding database entries in time.

Therefore, register the OAuth2 Token Cleaner, to remove 
expired access- & refresh-tokens, when necessary.

```typescript
import {
    runOAuth2Cleaner,
    setEntitiesForDataSourceOptions,
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
    setEntitiesForDataSourceOptions(options);
    
    // set subscribers
    setSubscribersForDataSourceOptions(options);

    const dataSource = new DataSource(options);
    await dataSource.initialize();

    // ------------------------------------
    
    await runOAuth2Cleaner();
})();
```
