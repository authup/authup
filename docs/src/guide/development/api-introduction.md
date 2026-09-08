# API

The **Authup API** provides a powerful and flexible interface to integrate authentication and authorization capabilities into applications.  
This section of the Developer Guide offers an overview of the API's structure, its key workflows, and best practices for using it effectively.

## Swagger
The full API reference is available via the built-in Swagger documentation.  
Once the backend is running, the Swagger interface can be accessed at:
**http://<BACKEND_URL>/docs** (e.g. `http://localhost:3000/docs`)

The document behind it is served next to it, at
**http://<BACKEND_URL>/docs/openapi.json**, which is the copy to feed a code
generator: the Swagger page inlines it into HTML and answers every other path
under the mount with that same page.

## Status endpoint

`GET /` answers anonymously with what a client needs to find the rest of the
deployment:

```json
{
    "version": "1.0.0-beta.64",
    "date": "2026-09-07T12:00:00.000Z",
    "publicUrl": "https://auth.example.com",
    "features": {
        "registration": true,
        "passwordRecovery": true,
        "emailVerification": true,
        "accountConsole": true,
        "adminConsole": true
    },
    "endpoints": {
        "openidConfiguration": "https://auth.example.com/.well-known/openid-configuration",
        "realms": "https://auth.example.com/realms",
        "docs": "https://auth.example.com/docs",
        "openapi": "https://auth.example.com/docs/openapi.json"
    },
    "consoles": {
        "admin": "https://auth.example.com/console/admin",
        "account": "https://auth.example.com/console/account",
        "auth": "https://auth.example.com/console/auth"
    }
}
```

- `publicUrl` is the address the `endpoints` derive from. The console URLs
  default to `<publicUrl>/console/<name>` and can be configured to another
  path on the same origin (`<name>Console.url`), so read them from
  `consoles` rather than deriving them.
- `endpoints.openidConfiguration` redirects to the master realm's OpenID
  provider metadata. Every realm's own document sits under `endpoints.realms`
  as `<realms>/<name>/.well-known/openid-configuration`, and the realm record
  read carries it too (see [OAuth2](./api-oauth2#discovery)).
- `endpoints.docs` and `endpoints.openapi` are `null` while the swagger
  middleware is off (`core.middlewareSwagger`).
- `consoles.admin` and `consoles.account` are `null` while that console is
  disabled (`adminConsole.enabled` / `accountConsole.enabled`); `features`
  says the same in boolean form. `consoles.auth` is always present, because
  the hosted login pages are the issuance surface and cannot be turned off.
- `features` is unchanged from earlier releases.

## What You'll Learn
This section is structured as follows:
- [OAuth2](./api-oauth2): A guide on how to implement OAuth2 flows for secure authentication and authorization.
- [Query Language](./api-query-language): The five query parameters every collection read accepts, their operators and their failure modes.
- [Query Reference](./api-query-reference): The queryable vocabulary of each entity, generated per release.
- [Examples](./api-examples): Practical examples of interacting with the API (e.g. users, roles, permissions) resources.
- [Error Handling](./api-error-handling.md): Learn how to manage and interpret API errors to handle failures gracefully.
