# OAuth2

## Cleaner
OAuth2 tokens which are used to handle authentication & authorization
are stored in the database and cached in redis.
It is necessary to remove the corresponding database entries in time.

The OAuth2 token cleaner is part of the server-core application and is located in
`apps/server-core/src/app/modules/components/`. It is no longer available as a
standalone `@authup/server-database` package export.
