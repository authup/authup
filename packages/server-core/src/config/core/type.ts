/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, ClientOptions } from 'redis-extension';
import { SmtpConfig } from '../../smtp';

export type CoreOptions = {
    /**
     * default: 'development'
     */
    env: string,
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
    webUrl: string,

    /**
     * default: process.cwd()
     */
    rootPath: string,
    /**
     * Relative or absolute path.
     * If the path is relative, the rootPath will be appended.
     *
     * default: writable
     */
    writableDirectoryPath: string

    /**
     * default: 3600
     */
    tokenMaxAgeAccessToken: number,

    /**
     * default: 3600
     */
    tokenMaxAgeRefreshToken: number,

    /**
     * default: true
     */
    redis: string | boolean | Client | ClientOptions,

    /**
     * default: false
     */
    smtp: string | boolean | SmtpConfig,

    // -------------------------------------------------

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

export type CoreOptionsInput = Partial<CoreOptions>;
