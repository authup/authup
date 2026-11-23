/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type LoginRedirectOptions = {
    /**
     * The app's login route, including any base path the compared value
     * carries. A destination on it or below it is refused, since landing
     * there after a login loops. Default `/login`.
     */
    loginPath?: string,
    /**
     * The app's logout route, likewise refused (a login would end in a
     * sign-out). Default `/logout`.
     */
    logoutPath?: string,
    /**
     * The `sessionStorage` key of the stash. Apps sharing an origin need one
     * each. Default `authup:login-redirect`.
     */
    storageKey?: string,
};
