/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ConsoleRuntimeConfigInput = {
    /**
     * The API URL the serving side injected (or a build-time value). Absent,
     * it is derived from the origin plus the prefix in front of the default
     * base path.
     */
    apiUrl?: string,
    /**
     * Path the console is served under.
     */
    basePath?: string,
    /**
     * The console's own mount (e.g. `/console/admin`). The API-prefix
     * derivation strips this whole suffix and nothing less.
     */
    basePathDefault: string,
    /**
     * The server vouching that it implements cookie mode.
     */
    cookieSession?: boolean,
    /**
     * The document's own origin, empty when unknown.
     */
    origin: string,
};

export type ConsoleRuntimeConfig = {
    apiUrl: string,
    basePath: string,
    /**
     * Path the kit store scopes its cookies to: the sub-path authup is served
     * under for a same-origin API, else the root.
     */
    cookiePath: string,
    cookieSession: boolean,
};
