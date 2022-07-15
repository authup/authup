# Database

## `setEntitiesForDataSourceOptions`

The `setEntitiesForDataSourceOptions()` method, extends the entities property of the DataSourceOptions.

**Type**
```ts
 function setEntitiesForDataSourceOptions<T extends DataSourceOptions>(options: T) : T;
```
**Example**
```ts
import { DataSourceOptions } from 'typeorm';

const options : DataSourceOptions = {
    // ...
};

// set entities
setEntitiesForDataSourceOptions(options);
```

## `setSubscribersForDataSourceOptions`

The `setSubscribersForDataSourceOptions()` method, extends the subscribers property of the DataSourceOptions.

**Type**
```ts
 function setSubscribersForDataSourceOptions<T extends DataSourceOptions>(options: T) : T;
```

**Example**
```ts
import { DataSourceOptions } from 'typeorm';

const options : DataSourceOptions = {
    // ...
};

// set entities
setSubscribersForDataSourceOptions(options);
```

## `DatabaseOptions`

```typescript
export type DatabaseOptions = {
    seed: DatabaseSeedOptions,
    alias?: string
};
```

## `DatabaseSeedOptions`

```typescript
type DatabaseSeedOptions = {
    admin: {
        username: string,
        password: string
        passwordReset?: boolean
    },

    robot: {
        enabled: boolean,
        secret?: string,
        secretReset?: boolean
    },

    permissions?: string[],
};
```
