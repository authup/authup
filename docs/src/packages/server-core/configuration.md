# Configuration 

The package can be configured by using the `setConfig` method,
which is exposed by the module.

::: warning Important
It is important to set the configuration in the entrypoint of the application,
before registering any sub-modul (http or database) is used.
::: 

All options inherit **default** values, so it is not mandatory to pass any option at all.

```typescript
import { setConfig } from '@authelion/server-core';

setConfig({
    env: 'development',
    port: 3010,
    database: {
        admin: {
            username: 'admin',
            password: 'start123'
        },
        robot: {
            enabled: true,
            secret: false
        }
    },
    tokenMaxAge: {
        accessToken: 3600, // 1 hour
        refreshToken: 36000 // 10 hours
    },
})
```

To get an insight of a full list of options, which can be passed to the method, check out the [API Reference]().
