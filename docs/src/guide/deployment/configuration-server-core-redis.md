# Redis

Redis is used for caching database queries if a connection to a redis server is configured.
Redis is also used to publish changes (create, update, delete) to domain entities using the pub-sub pattern, to which microservices can respond.

Without Redis every process keeps its caches in memory, its read cache included. A deployment
running more than one API process therefore needs Redis: otherwise a revoked token, a deactivated
account or a changed grant written through one process is still answered from the cache of the
others for up to 60 seconds.

The environment variables in the .env file variant can also be provided via runtime environment.

::: code-group

```typescript{3-7} [authup.ts]

export default {
    // ...
    /**
     * Boolean or connection string (redis://127.0.0.1)
     */
    redis: true,
    // ...
}
```

```yaml [authup.yml]
redis: redis://127.0.0.1
```

```dotenv [.env]
REDIS=redis://127.0.0.1
```
:::
