/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config } from '@authup/server-common';
import path from 'path';
import process from 'process';
import zod from 'zod';
import { Options, OptionsInput } from './type';

let instance : Config<Options, OptionsInput> | undefined;

export function useConfig() : Config<Options, OptionsInput> {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = createConfig();

    return instance;
}

export function createConfig() {
    return new Config<Options, OptionsInput>({
        defaults: {
            port: 3010,
            selfUrl: 'http://127.0.0.1:3010',
            uiUrl: 'http://127.0.0.1:3000',
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
            uiUrl: (value) => zod.string().url().safeParse(value),
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
}

export function setConfig(
    input: OptionsInput | Config<Options, OptionsInput>,
) : Options {
    if (input instanceof Config) {
        // todo: maybe merge with existing options
        instance = input;
        return instance.getAll();
    }

    const config = useConfig();
    config.setRaw(input);

    return config.getAll();
}
