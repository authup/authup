# Config


## `useConfig`

The `useConfig()` method returns the configuration class. 
If no configuration is set, the method will use default options.

**Type**
```ts
declare function useConfig() : Config;
```

## `setConfigOptions`

The `setConfigOptions()` method can be used to set/append config options:

**Type**
```ts
declare function setConfigOptions(value: OptionsInput);
```

**Example**
```ts
setConfigOptions({
    adminUsername: 'admin',
    adminPassword: 'start123',
    robotEnabled: true,
    permissions: ['data_add', 'data_edit']
})
```

## `Options`

**Type**
```typescript
declare type Options = {
    /**
     * default: process.cwd()
     */
    rootPath: string,
    /**
     * Relative/absolute path to the writable directory.
     * default: path.join(process.cwd(), 'writable')
     */
    writableDirectoryPath: string,
    /**
     * default: 'development'
     */
    env: string,
    /**
     * default: 'admin'
     */
    adminUsername: string,
    /**
     * default: 'start123'
     */
    adminPassword: string,
    /**
     * default: undefined
     */
    adminPasswordReset?: boolean,
    /**
     * default: false
     */
    robotEnabled: boolean,
    /**
     * default: undefined
     */
    robotSecret?: string,
    /**
     * default: undefined
     */
    robotSecretReset?: boolean,
    /**
     * default: []
     */
    permissions: string[],
};
```

## `OptionsInput`

```typescript
export type OptionsInput = Partial<Omit<Options, 'permissions'>> & {
    /**
     * default: []
     */
    permissions?: string[] | string
};
```
