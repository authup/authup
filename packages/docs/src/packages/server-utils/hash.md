# Hash

## `compare`

The method `compare()` compares a raw value with a hashed value. 

- **Type**
    ```ts
    async function compare(value: string, hashedValue: string) : Promise<boolean>;
    ```
- **Example**
    ```typescript
    import {
        compare,
        hash
    } from "@authup/server-utils";

    (async () => {
        const hashed = await hash('start123', 10); // 10 rounds
        let isValid = await compare('start123', hashed);
  
        console.log(isValid);
        // true
    });
    ```

## `hash`

The method `hash()` returns the hashed value of an input string.

- **Type**
    ```ts
    async function hash(value: string) : Promise<string>;
    ```
- **Example**
    ```typescript
    import {
        hash
    } from "@authup/server-utils";

    (async () => {
        const hashed = await hash('start123', 10); // 10 rounds
  
        console.log(hashed);
        // ...
    });
    ```
