# SMTP

To enable the confirmation of a registration, the resetting of a password, the SMTP client must be configured.
The SMTP client is based on nodemailer and can be configured via connection string or connection object.

::: warning

It is important to note that when specifying via environment variable,
only a **boolean** or a connecting **string** can be specified.

:::

The server certificate of the SMTP relay is verified, whichever form is used.
A relay presenting a self-signed or otherwise untrusted certificate is only accepted
when the configuration object sets `rejectUnauthorized: false` (next to either the
connection fields or a `connectionString`), or when a connection string carries
`?tls.rejectUnauthorized=false`, which is the only way to say it through the environment.

The environment variables in the .env file variant can also be provided via runtime environment.


::: code-group

```typescript{3-19} [authup.ts]

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
        rejectUnauthorized: true,
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
  rejectUnauthorized: true
  from: no-reply@example.com
  fromDisplayName: Authup
  replyTo: contact@example.com
  replyToDisplayName: Authup
```

```dotenv [.env]
SMTP=smtp(s)://username:password@smtp.example.com
```
:::
