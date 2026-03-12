# Redis

Redis is used for caching database queries if a connection to a redis server is configured.
Redis is also used to publish changes (create, update, delete) to domain entities using the pub-sub pattern, to which microservices can respond.

The environment variables in the .env file variant can also be provided via runtime environment.

::: code-group

```typescript{3-7} [authup.server.core.ts]

export default {
    // ...
    /**
     * Boolean or connection string (redis://127.0.0.1)
     */
    redis: true,
    // ...
}
```

```dotenv [authup.server.core.conf]
redis=redis://127.0.0.1
```

```dotenv [.env]
REDIS=redis://127.0.0.1
```
:::
