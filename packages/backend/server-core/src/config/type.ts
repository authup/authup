/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from 'redis-extension';

export type Config = {
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
    redis: string | boolean | Client,

    // -------------------------------------------------

    /**
     * default: 'admin'
     */
    adminUsername: string,

    /**
     * default: 'start123'
     */
    adminPassword: string,

    /**
     * default: undefined
     */
    adminPasswordReset?: boolean,

    /**
     * default: false
     */
    robotEnabled: boolean,

    /**
     * default: undefined
     */
    robotSecret?: string,

    /**
     * default: undefined
     */
    robotSecretReset?: boolean,

    /**
     * default: []
     */
    permissions?: string[] | string,

    // -------------------------------------------------

    /**
     * default: undefined
     */
    keyPairPassphrase?: string,

    /**
     * default: 'private'
     */
    keyPairPrivateName?: string,

    /**
     * default: '.pem'
     */
    keyPairPrivateExtension?: string,

    // -------------------------------------------------

    /**
     * default: true
     */
    middlewareBodyParser: boolean;

    /**
     * default: true
     */
    middlewareCookieParser: boolean;

    /**
     * default: true
     */
    middlewareResponse: boolean;

    /**
     * default: true
     */
    middlewareSwaggerEnabled: boolean;

    /**
     * default: config.writableDirectoryPath
     */
    middlewareSwaggerDirectoryPath: string;
};
