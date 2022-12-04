/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config } from '@authup/server-common';
import path from 'path';
import process from 'process';
import { merge } from 'smob';
import zod from 'zod';
import { Options, OptionsInput } from './type';
import { extractOptionsFromEnv } from './utils';

let instance : Config<Options, OptionsInput> | undefined;

export function useConfig() : Config<Options, OptionsInput> {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = new Config<Options, OptionsInput>({
        defaults: {
            port: 3010,
            selfUrl: 'http://127.0.0.1:3010',
            webUrl: 'http://127.0.0.1:3010',
            env: process.env.NODE_ENV || 'development',
            rootPath: process.cwd(),
            writableDirectoryPath: path.join(process.cwd(), 'writable'),
            middlewareBody: true,
            middlewareCookie: true,
            middlewareSwagger: true,
            tokenMaxAgeAccessToken: 3600,
            tokenMaxAgeRefreshToken: 3600,
            registration: false,
            emailVerification: false,
            forgotPassword: false,
        },
        validators: {
            port: (value) => zod.number().nonnegative().safeParse(value),
            selfUrl: (value) => zod.string().url().safeParse(value),
            webUrl: (value) => zod.string().url().safeParse(value),
            env: (value) => zod.string().safeParse(value),
            rootPath: (value) => zod.string().safeParse(value),
            writableDirectoryPath: (value) => zod.string().safeParse(value),
            middlewareBody: (value) => zod.boolean().safeParse(value),
            middlewareCookie: (value) => zod.boolean().safeParse(value),
            middlewareSwagger: (value) => zod.boolean().safeParse(value),
            tokenMaxAgeAccessToken: (value) => zod.number().nonnegative().safeParse(value),
            tokenMaxAgeRefreshToken: (value) => zod.number().nonnegative().safeParse(value),
            registration: (value) => zod.boolean().safeParse(value),
            emailVerification: (value) => zod.boolean().safeParse(value),
            forgotPassword: (value) => zod.boolean().safeParse(value),
        },
    });

    return instance;
}

export function setConfig(options: OptionsInput) {
    options = merge({}, extractOptionsFromEnv(), options);

    const config = useConfig();
    config.setRaw(options);
}
