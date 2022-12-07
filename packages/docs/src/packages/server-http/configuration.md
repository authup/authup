# Configuration

::: warning Important
It is important to set the configuration, before using other parts of this packages.
:::

To get an insight of a full list of options, which can be passed to the method, check out the [API Reference](api-reference-config.md#config).


The `setOptions` method, can be used to provide an initial set of options.
All options inherit **default** values, so it is not mandatory to pass any option at all.

```typescript
import { setOptions } from '@authup/server-http';

setOptions({
    env: 'development',
    port: 3010,
    /* ... */
})
```

The `readOptionsFromEnv` method, can be used to load option values from the environment.

```typescript
import { setOptions, readOptionsFromEnv } from '@authup/server-http';

const env = readOptionsFromEnv();

setOptions({
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
