# General

## `setEntitiesForDataSourceOptions`

The `setEntitiesForDataSourceOptions()` method, extends the entities property of the DataSourceOptions.

**Type**
```ts
declare function setEntitiesForDataSourceOptions<T extends DataSourceOptions>(
    options: T
) : T;
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
declare function setSubscribersForDataSourceOptions<T extends DataSourceOptions>(
    options: T
): T;
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
