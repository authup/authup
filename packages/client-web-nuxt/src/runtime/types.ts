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
     * Prefix prepended to every session cookie name
     * (client-side & server-side)
     *
     * The session cookies are written under fixed names (`access_token`,
     * `refresh_token`, ...). Widening `cookieDomain` delivers those names to
     * every host under that domain, so any other authup client there writes
     * the same names and the browser ends up holding two records under one.
     * A prefix keeps them apart.
     *
     * Prepended verbatim, so `flame_` writes `flame_access_token`. Use cookie
     * name characters only: letters, digits, `_`, `-`, `.`, never `:` or a
     * space.
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
