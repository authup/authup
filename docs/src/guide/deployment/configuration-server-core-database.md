# Database

With no database configured, `SQLite` is used, which is enough to run Authup locally.
For anything beyond that, `MySQL` or `Postgres` is a requirement rather than a recommendation:
Authup refuses to start on `SQLite` when the environment is `production`, and the Docker image
sets `NODE_ENV=production`. They are also the better fit for a real deployment, since they
provide superior performance, scalability and advanced features such as built-in replication.

## MySQL

The environment variables in the .env file variant can also be provided via runtime environment.
::: code-group

```typescript{3-10} [authup.ts]

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

```yaml [authup.yml]
db:
  type: mysql
  host: 127.0.0.1
  port: 3306
  username: root
  password: start123
  database: app
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

```typescript{3-10} [authup.ts]

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

```yaml [authup.yml]
db:
  type: postgres
  host: 127.0.0.1
  port: 5432
  username: root
  password: start123
  database: app
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
