# Configuration 

The package can be configured by using the `setConfig` method,
which is exposed by the module.

::: warning Important
It is important to set the configuration in the entrypoint of the application,
before registering any sub-modul (http or database) is used.
::: 

All options inherit **default** values, so it is not mandatory to pass any option at all.
To get an insight of a full list of options, which can be passed to the method, check out the [API Reference](api-reference-config.md#config).

```typescript
import { setConfig } from '@authelion/server-core';

setConfig({
    env: 'development',
    port: 3010,
    /* ... */
})
```

## Extend loaded config

It is also possible to extend the configuration found on the file system and from the environment variables.

```typescript
import { loadConfig, setConfig } from '@authelion/server-core';

(async () => {
    const config = await loadConfig();
    
    setConfig({
        ...config,
        env: 'development',
        port: 3010
    })
})();
```

## Environment Variables

It is also possible to fill the configuration values by **env** key value pairs.

- `NODE_ENV`
- `PORT`
- `SELF_URL`
- `WEB_URL`
- `WRITABLE_DIRECTORY_PATH`
- `ACCESS_TOKEN_MAX_AGE`
- `REFRESH_TOKEN_MAX_AGE`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ROBOT_ENABLED`
- `ROBOT_SECRET`
- `PERMISSIONS`
