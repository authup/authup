# Configuration

::: warning Important
It is important to set the configuration, before using other parts of this packages.
:::

To get an insight of a full list of options, which can be passed to the method,
check out the [API Reference](api-reference-config.md#config).


The `setConfigOptions` method, can be used to set a collection of options to the (existing) config instance.
All other options inherit **default** values.

```typescript
import { setConfigOptions } from '@authup/server-database';

setConfigOptions({
    permissions: [
        'resource_add',
        'resource_drop',
    ]
    /* ... */
})
```

The `readOptionsFromEnv` method, can be used to load option values from the environment.

```typescript
import { setConfigOptions, readOptionsFromEnv } from '@authup/server-database';

const env = readOptionsFromEnv();

setConfigOptions({
    ...env,
    /* ... */
})
```

The following environment variables are available:

- `NODE_ENV`: **string**
- `WRITABLE_DIRECTORY_PATH`: **string**
- `ADMIN_USERNAME`: **string**
- `ADMIN_PASSWORD`: **string**
- `ROBOT_ENABLED`: **boolean**
- `ROBOT_SECRET`: **string**
- `PERMISSIONS`: **string**
