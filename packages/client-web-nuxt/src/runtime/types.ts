/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
     * Namespace the store cookies under this application's OAuth2 client
     * name, as `<prefix>.<name>`.
     *
     * Set it whenever the app can share an origin (or a host, since cookies
     * ignore the port) with the authup IdP or another kit app. Bare names
     * belong to the IdP's own SSO session; a prefixed set belongs to one
     * application.
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

export type MiddlewareHookPayload = {
    to: {
        fullPath: string
    },
    from: {
        fullPath: string
    },
};
