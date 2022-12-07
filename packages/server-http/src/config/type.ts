/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type Options = {
    env: string,
    rootPath: string,

    writableDirectoryPath: string,

    /**
     * default: 3010
     */
    port: number,

    /**
     * default: http://127.0.0.1:3010
     */
    selfUrl: string,
    /**
     * default: http://127.0.0.1:3010
     */
    uiUrl: string,

    /**
     * use body middleware
     *
     * default: true
     */
    middlewareBody: boolean,
    /**
     * use cookie middleware
     *
     * default: true
     */
    middlewareCookie: boolean,
    /**
     * use swagger middleware
     *
     * default: true
     */
    middlewareSwagger: boolean,

    /**
     * default: 3600
     */
    tokenMaxAgeAccessToken: number,

    /**
     * default: 3600
     */
    tokenMaxAgeRefreshToken: number,

    /**
     * Enable registration.
     *
     * default: false
     */
    registration: boolean,

    /**
     * Email verification required for registration or login with identity provider.
     *
     * default: false
     */
    emailVerification: boolean,

    /**
     * Allow password reset?
     *
     * default: false
     */
    forgotPassword: boolean
};

export type OptionsInput = Partial<Options>;
