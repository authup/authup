# Config

## `setConfig`

The `setConfig()` method, specify options for all submodules:

**Type**
```ts
function setConfig(value: Subset<Config>) : Config;
```

**Example**
```ts
setConfig({
    port: 3010,
    adminUsername: 'admin',
    adminPassword: 'start123',
    robotEnabled: true,
    permissions: ['data_add', 'data_edit']
})
```
**Type References**
- [Config](api-reference-middleware#config)

## `useConfig`

The asynchronous `useConfig()` method returns the configuration obect. If no configuration is set,
the method attempts to load the configuration file or initialize the configuration by environment variables.

**Type**
```ts
async function useConfig(value: Subset<Config>) : Promise<Config>;
```
**Type References**
- [Config](api-reference-middleware#config)

## `useConfigSync`

The synchronous `useConfigSync()` method returns the configuration obect. If no configuration is set,
the method attempts to load the configuration file or initialize the configuration by environment variables.

**Type**
```ts
function useConfigSync(value: Subset<Config>) : Config;
```
**Type References**
- [Config](api-reference-middleware#config)

## `Config`

**Type**
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
     * default: http://127.0.0.1:3010
     */
    selfUrl: string,
    /**
     * default: http://127.0.0.1:3010
     */
    webUrl: string,

    /**
     * default: process.cwd()
     */
    rootPath: string,
    /**
     * Relative or absolute path.
     * If the path is relative, the rootPath will be appended.
     *
     * default: writable
     */
    writableDirectoryPath: string

    /**
     * default: 3600
     */
    tokenMaxAgeAccessToken: number,

    /**
     * default: 3600
     */
    tokenMaxAgeRefreshToken: number,

    /**
     * default: true
     */
    redis: string | boolean | Client,

    // -------------------------------------------------

    /**
     * default: 'admin'
     */
    adminUsername: string,

    /**
     * default: 'start123'
     */
    adminPassword: string,

    /**
     * default: false
     */
    robotEnabled: boolean,

    /**
     * default: undefined
     */
    robotSecret?: string,

    /**
     * default: []
     */
    permissions?: string[] | string,

    // -------------------------------------------------

    /**
     * default: undefined
     */
    keyPairPassphrase?: string,

    /**
     * default: 'private'
     */
    keyPairPrivateName?: string,

    /**
     * default: '.pem'
     */
    keyPairPrivateExtension?: string,

    // -------------------------------------------------

    /**
     * default: true
     */
    middlewareBodyParser: boolean;

    /**
     * default: true
     */
    middlewareCookieParser: boolean;

    /**
     * default: true
     */
    middlewareResponse: boolean;

    /**
     * default: true
     */
    middlewareSwaggerEnabled: boolean;

    /**
     * default: config.writableDirectoryPath
     */
    middlewareSwaggerDirectoryPath: string;
};
```
