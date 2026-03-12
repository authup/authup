# Database

By default, the database is run with `SQLite`,
but for a production environment we recommend using `MySQL` or `Postgres` since they provide
superior performance, scalability and advanced features such as built-in replication.

## MySQL

The environment variables in the .env file variant can also be provided via runtime environment.
::: code-group

```typescript{3-10} [authup.server.core.ts]

export default {
    // ...
    db: {
        type: 'mysql',
        host: '127.0.0.1', 
        port: 3306, 
        username: 'root', 
        password: 'start123',
        database: 'app'
    }   
    // ...
}
```

```dotenv [authup.server.core.conf]
db.type=mysql
db.host=127.0.0.1
db.port=3306
db.username=root
db.password=start123
db.database=app
```

```dotenv [.env]
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=start123
DB_DATABASE=app
```
:::

## Postgres

The environment variables in the .env file variant can also be provided via runtime environment.

::: code-group

```typescript{3-10} [authup.server.core.ts]

export default {
    // ...
    db: {
        type: 'postgres',
        host: '127.0.0.1', 
        port: 5432, 
        username: 'root', 
        password: 'start123',
        database: 'app'
    }   
    // ...
}
```

```dotenv [authup.server.core.conf]
db.type=postgres
db.host=127.0.0.1
db.port=5432
db.username=root
db.password=start123
db.database=app
```

```dotenv [.env]
DB_TYPE=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=root
DB_PASSWORD=start123
DB_DATABASE=app
```
:::
