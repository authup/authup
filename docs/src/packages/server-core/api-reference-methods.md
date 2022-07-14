# API Reference - Methods

## `setConfig`

The `setConfig()` method, specify options for all sub modules:

- **Type**
    ```ts
    function setConfig(value: Subset<Config>) : Config;
    ```
- **Example**
    ```ts
    setConfig({
        port: 3010,
        database: {
            seed: {
                admin: {
                    username: 'admin',
                    password: 'start123'
                },
                robot: {
                    enabled: true
                }
            } 
        } 
    })
    ```
- **Type References**
  - [Config](api-reference-types#config)

## `useConfig`

The asynchronous `useConfig()` method returns the configuration obect. If no configuration is set, 
the method attempts to load the configuration file or initialize the configuration by environment variables.

- **Type**
    ```ts
    async function useConfig(value: Subset<Config>) : Promise<Config>;
    ```
- **Type References**
    - [Config](api-reference-types#config)

## `useConfigSync`

The synchronous `useConfigSync()` method returns the configuration obect. If no configuration is set,
the method attempts to load the configuration file or initialize the configuration by environment variables.

- **Type**
    ```ts
    function useConfigSync(value: Subset<Config>) : Config;
    ```
- **Type References**
    - [Config](api-reference-types#config)


## `setEntitiesForDataSourceOptions`

The `setEntitiesForDataSourceOptions()` method, extends the entities property of the DataSourceOptions.

- **Type**
    ```ts
     function setEntitiesForDataSourceOptions<T extends DataSourceOptions>(options: T) : T;
    ```
- **Example**
    ```ts
    import { DataSourceOptions } from 'typeorm';
  
    const options : DataSourceOptions = {
        // ...
    };

    // set entities
    setEntitiesForDataSourceOptions(options);
    ```

## `setSubscribersForDataSourceOptions`

The `setSubscribersForDataSourceOptions()` method, extends the subscribers property of the DataSourceOptions.

- **Type**
    ```ts
     function setSubscribersForDataSourceOptions<T extends DataSourceOptions>(options: T) : T;
    ```
- **Example**
    ```ts
    import { DataSourceOptions } from 'typeorm';
  
    const options : DataSourceOptions = {
        // ...
    };

    // set entities
    setSubscribersForDataSourceOptions(options);
    ```
