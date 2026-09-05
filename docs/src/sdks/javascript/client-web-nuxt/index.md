# Client-Web-Nuxt

This package provides a module for nuxt, which is build on top of the [client-web-kit](./../client-web-kit/index.md) package.

## Installation

Add the package as a dev-dependency to the project.

```sh
npm install @authup/client-web-nuxt --save-dev
```

## Configuration

Modify the `nuxt.config.ts` file and extend the modules section.
The module can be configured with different [options](#options).
In the following code snippet, the URL for the Authup API is provided via runtimeConfig.
The one server-only option, `serverApiURL`, is written to the private `runtimeConfig.authup` rather than the public block, so the internal API address is never serialized into the rendered page; override it at runtime with `NUXT_AUTHUP_SERVER_API_URL` (not `NUXT_PUBLIC_AUTHUP_SERVER_API_URL`).

```typescript
import { defineNuxtConfig } from 'nuxt';

export default defineNuxtConfig({
    // ...
    runtimeConfig: {
        authupUrl: process.env.AUTHUP_URL,
        public: {
            authupUrl: process.env.AUTHUP_URL
        }
    },
    modules: [
        [
            '@authup/client-web-nuxt',
            {
                apiURLRuntimeKey: 'authupUrl',
                // module options
            }
        ]
    ]
    // ...
});
```

## Options

The following module options are available:

```typescript
export type RuntimeOptions = {
    /**
     * Explicit URL of the Authup API (client-side)
     */
    apiURL?: string,

    /**
     * Explicit URL of the Authup API (server-side)
     *
     * Kept in the private `runtimeConfig.authup`, never in the public block
     * that is serialized into every rendered page. The runtime override is
     * `NUXT_AUTHUP_SERVER_API_URL`, not `NUXT_PUBLIC_AUTHUP_SERVER_API_URL`.
     */
    serverApiURL?: string,

    /**
     * Runtime config key to retrieve the Authup API URL
     * (client-side & server-side)
     */
    apiURLRuntimeKey?: string,

    /**
     * Explicit cookie domain
     * (client-side & server-side)
     */
    cookieDomain?: string,

    /**
     * Runtime config key to retrieve the cookie domain
     * (client-side & server-side)
     */
    cookieDomainRuntimeKey?: string,

    /**
     * Prefix prepended to every session cookie name
     * (client-side & server-side)
     *
     * See "Namespacing the session cookies" below.
     */
    cookiePrefix?: string,

    /**
     * Path of the home route
     * Default: /
     */
    homeRoute?: string,

    /**
     * Path of the login route
     * Default: /login
     */
    loginRoute?: string
};
```

## Namespacing the session cookies

The session cookies are written under fixed names (`access_token`,
`refresh_token`, `id_token`, `realm`, ...). Widening `cookieDomain` delivers
those names to every host under that domain, so any other authup client
reachable there writes the same names and the browser ends up holding two
records under one name. A read takes the first, which can be the older one,
and each side then drives on, refreshes and revokes the other's tokens. It
surfaces as being signed out on the next page load.

Set `cookiePrefix` to keep them apart:

```typescript
export default defineNuxtConfig({
    // ...
    modules: [
        [
            '@authup/client-web-nuxt',
            {
                apiURLRuntimeKey: 'authupUrl',
                cookieDomainRuntimeKey: 'cookieDomain',
                cookiePrefix: 'flame_'
            }
        ]
    ]
    // ...
});
```

The value is prepended verbatim, so `access_token` becomes
`flame_access_token`. Use cookie name characters only: letters, digits, `_`,
`-` and `.`, never `:` or a space.

Two consequences to plan for:

- **The prefix applies to everything that reads these cookies**, not only the
  Nuxt app. A resource server of your own that reads the access token out of
  the cookie, because a file download is a top-level navigation and cannot
  carry an `Authorization` header, must read the prefixed name.
- **Cookies written before the prefix was set are afterwards neither read nor
  cleared**, because signing out only clears the prefixed names. So sign out
  *before* you set the prefix, and nothing is left behind. If you have already
  switched, the leftovers still clear themselves: `refresh_token`, `id_token`,
  `realm` and `realm_management` are session cookies that go away when the
  browser closes, and the bare `access_token` pair carries the access token's
  own lifetime, 15 minutes by default. Clear them for the domain by hand if
  you would rather not wait.
