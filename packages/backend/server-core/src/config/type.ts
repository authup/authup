/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from 'redis-extension';
import { SMTPOptions } from './smtp';
import { DatabaseOptions } from './database';
import { MiddlewareOptions } from './http';

export type ConfigKeyPrefixAdd<Key, Prefix extends string> = Key extends string ?
    `${Prefix}${Capitalize<Key>}` :
    never;

export type ConfigKeyPrefixRemove<
    PrefixedKey,
    Prefix extends string,
    > = PrefixedKey extends ConfigKeyPrefixAdd<infer Key, Prefix> ?
        (
            Key extends string ?
            `${Uncapitalize<Key>}` :
                never
        ) :
        never;

export type ConfigKeyPrefixOptions<O extends object, P extends string> = {
    [K in keyof O as ConfigKeyPrefixAdd<K, P>]: O[K]
};

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
    forgotPassword: boolean,

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
    keyPairPrivateExtension?: string
} &
ConfigKeyPrefixOptions<DatabaseOptions, 'database'> &
ConfigKeyPrefixOptions<MiddlewareOptions, 'middleware'> &
ConfigKeyPrefixOptions<SMTPOptions, 'smtp'>;
