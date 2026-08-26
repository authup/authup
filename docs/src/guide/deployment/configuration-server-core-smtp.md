# SMTP

To enable the confirmation of a registration, the resetting of a password, the SMTP client must be configured.
The SMTP client is based on nodemailer and can be configured via connection string or connection object.

::: warning

It is important to note that when specifying via environment variable,
only a **boolean** or a connecting **string** can be specified.

:::

The environment variables in the .env file variant can also be provided via runtime environment.


::: code-group

```typescript{3-18} [authup.ts]

export default {
    // ...
    /**
     * Boolean, connection string or configuration object. 
     * (smtp(s)://username:password@smtp.example.com)
     */
    smtp: {
        host: '127.0.0.1', 
        port: 25, 
        user: '', 
        password: '', 
        ssl: false, 
        starttls: false, 
        from: 'no-reply@example.com', 
        fromDisplayName: 'Authup', 
        replyTo: 'contact@example.com', 
        replyToDisplayName: 'Authup'
    }   
    // ...
}
```

```yaml [authup.yml]
smtp:
  host: 127.0.0.1
  port: 25
  user: ''
  password: ''
  ssl: false
  starttls: false
  from: no-reply@example.com
  fromDisplayName: Authup
  replyTo: contact@example.com
  replyToDisplayName: Authup
```

```dotenv [.env]
SMTP=smtp(s)://username:password@smtp.example.com
```
:::
