# Vault

Vault is used to securely manage the credentials of robot accounts in plain text.

::: warning

It is important to note that when specifying via environment variable, 
only a **boolean** or a connecting **string** can be specified.

:::

The environment variables in the .env file variant can also be provided via runtime environment.

::: code-group

```typescript{4-7} [authup.server.core.ts]

export default {
    // ...
    /**
     * Boolean or connection string (start123@http://127.0.0.1:8090/v1/)
     */
    vault: true,
    // ...
}
```

```dotenv [authup.server.core.conf]
vault=start123@http://127.0.0.1:8090/v1/
```

```dotenv [.env]
vault=start123@http://127.0.0.1:8090/v1/
```
:::
