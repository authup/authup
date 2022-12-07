# Configuration

::: warning Important
It is important to set the configuration, before using other parts of this packages.
:::

To get an insight of a full list of options, which can be passed to the method, check out the [API Reference](api-reference-config.md#config).


The `setConfigOptions` method, can be used to set a collection of options to the (existing) config instance.
All other options inherit **default** values.

```typescript
import { setConfigOptions } from '@authup/server-http';

setConfigOptions({
    env: 'development',
    port: 3010,
    /* ... */
})
```

The `readOptionsFromEnv` method, can be used to load option values from the environment.

```typescript
import { setConfigOptions, readOptionsFromEnv } from '@authup/server-http';

const env = readOptionsFromEnv();

setConfigOptions({
    ...env,
    env: 'development',
    port: 3010,
    /* ... */
})
```

The following environment variables are available:

- `NODE_ENV`: **string**
- `WRITABLE_DIRECTORY_PATH`: **string**
- `PORT`: **number**
- `SELF_URL`: **string**
- `UI_URL`: **string**
- `ACCESS_TOKEN_MAX_AGE`: **number**
- `REFRESH_TOKEN_MAX_AGE`: **number**
- `REGISTRATION`: **boolean**
- `EMAIL_VERIFICATION`: **boolean**
