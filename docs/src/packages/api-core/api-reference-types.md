# API Reference - Types

## `Config`
```typescript
type Config = {
    /**
     * default: 'development'
     */
    env: string,
    /**
     * default: 3010
     */
    port: number,

    /**
     * default: {
     *     seed: {
     *         admin: {
     *             username: 'admin',
     *             password: 'start123'
     *         },
     *         robot: {
     *             enabled: true
     *         }
     *     }
     * }
     */
    database: DatabaseOptions,

    /**
     * default: process.cwd()
     */
    rootPath: string,
    /**
     * default: writable
     */
    writableDirectory: string

    /**
     * default: http://127.0.0.1:3010
     */
    selfUrl: string,
    /**
     * default: http://127.0.0.1:3010
     */
    webUrl: string,

    /**
     * default: {
     *     directory: path.join(process.cwd(), 'writable)
     * }
     */
    keyPair: Partial<KeyPairContext>,

    /**
     * default: 3600
     */
    tokenMaxAge: TokenMaxAgeType,

    /**
     * default: {
     *     enabled: false
     * }
     */
    redis: string | boolean | Client,

    /**
     * default: {
     *     bodyParser: true,
     *     cookieParser: true,
     *     response: true,
     *     swagger: {
     *         enabled: true,
     *         directory: path.join(process.cwd(), 'writable)
     *     }
     * }
     */
    middleware: MiddlewareOptions
};
```

## `DatabaseOptions`

```typescript
export type DatabaseOptions = {
    seed: DatabaseSeedOptions,
    alias?: string
};
```

## `DatabaseSeedOptions`

```typescript
type DatabaseSeedOptions = {
    admin: {
        username: string,
        password: string
        passwordReset?: boolean
    },

    robot: {
        enabled: boolean,
        secret?: string,
        secretReset?: boolean
    },

    permissions?: string[],
};
```

## `MiddlewareOptions`

```typescript
type MiddlewareOptions = {
    bodyParser?: boolean,
    cookieParser?: boolean,
    response?: boolean,
    swagger?: MiddlewareSwaggerOptions
};
```

## `MiddlewareSwaggerOptions`

```typescript
export type MiddlewareSwaggerOptions = {
    enabled?: boolean,
    directory?: string
};
```
