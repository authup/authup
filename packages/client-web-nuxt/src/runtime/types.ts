/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type AuthupRuntimeOptions = {
    apiURL?: string,
    apiURLRuntimeKey?: string,

    /**
     * Separate apiURL for server side rendering.
     */
    apiURLServer?: string,
    /**
     * Separate extraction of apiURL for server side rendering.
     */
    apiURLServerRuntimeKey?: string,

    cookieDomain?: string,
    cookieDomainRuntimeKey?: string,

    homeRoute?: string,
    loginRoute?: string,
    logoutRoute?: string
};
