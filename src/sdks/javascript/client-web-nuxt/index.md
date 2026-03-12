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
     * Path of the home route
     * Default: /logout
     */
    homeRoute?: string,

    /**
     * Path of the login route
     * Default: /login
     */
    loginRoute?: string
};
```


