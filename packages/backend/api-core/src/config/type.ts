/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenMaxAgeType } from '@authelion/common';
import { KeyPairContext } from '@authelion/api-utils';
import { Client } from 'redis-extension';
import { MiddlewareOptions } from '../http';
import { DatabaseOptions } from '../database';

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
     * default: {
     *     seed: {
     *         admin: {
     *             username: 'admin',
     *             password: 'start123'
     *         },
     *         robot: {
     *             enabled: true
     *         }
     *     }
     * }
     */
    database: DatabaseOptions,

    /**
     * default: process.cwd()
     */
    rootPath: string,
    /**
     * default: writable
     */
    writableDirectory: string

    /**
     * default: http://127.0.0.1:3010
     */
    selfUrl: string,
    /**
     * default: http://127.0.0.1:3010
     */
    webUrl: string,

    /**
     * default: {
     *     directory: path.join(process.cwd(), 'writable)
     * }
     */
    keyPair: Partial<KeyPairContext>,

    /**
     * default: 3600
     */
    tokenMaxAge: TokenMaxAgeType,

    /**
     * default: {
     *     enabled: false
     * }
     */
    redis: string | boolean | Client,

    /**
     * default: {
     *     bodyParser: true,
     *     cookieParser: true,
     *     response: true,
     *     swagger: {
     *         enabled: true,
     *         directory: path.join(process.cwd(), 'writable)
     *     }
     * }
     */
    middleware: MiddlewareOptions
};
