/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options as HTTPOptions, OptionsInput as HTTPOptionsInput } from '@authup/server-http';
import type { Options as DatabaseOptions, OptionsInput as DatabaseOptionsInput } from '@authup/server-database';
import type { Client, ClientOptions } from 'redis-extension';
import type { SmtpConfig } from '@authup/server-common';

export type BaseOptions = {
    /**
     * default: 'development'
     */
    env: string,

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
     * default: true
     */
    redis: string | boolean | Client | ClientOptions,

    /**
     * default: false
     */
    smtp: string | boolean | SmtpConfig,
};

export type BaseOptionsInput = Partial<BaseOptions>;

export type Options = {
    base: BaseOptions,
    database: Omit<DatabaseOptions, 'env' | 'rootPath' | 'writableDirectoryPath'>,
    http: Omit<HTTPOptions, 'env' | 'rootPath' | 'writableDirectoryPath'>
};

export type OptionsInput = {
    base?: BaseOptionsInput,
    database?: Omit<DatabaseOptionsInput, 'env' | 'rootPath' | 'writableDirectoryPath'>,
    http?: Omit<HTTPOptionsInput, 'env' | 'rootPath' | 'writableDirectoryPath'>
};
