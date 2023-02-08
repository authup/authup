/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Continu } from 'continu';
import path from 'node:path';
import process from 'node:process';
import zod from 'zod';
import { Options, OptionsInput } from './type';

let instance : Continu<Options, OptionsInput> | undefined;

export function useConfig() : Continu<Options, OptionsInput> {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = createConfig();

    return instance;
}

export function createConfig() {
    return new Continu<Options, OptionsInput>({
        defaults: {
            port: 3010,
            host: '0.0.0.0',
            publicUrl: 'http://127.0.0.1:3010',
            authorizeRedirectUrl: 'http://127.0.0.1:3000',
            env: process.env.NODE_ENV || 'development',
            rootPath: process.cwd(),
            writableDirectoryPath: path.join(process.cwd(), 'writable'),
            middlewareBody: true,
            middlewareCookie: true,
            middlewareCors: true,
            middlewarePrometheus: true,
            middlewareQuery: true,
            middlewareRateLimit: true,
            middlewareSwagger: true,
            tokenMaxAgeAccessToken: 3600,
            tokenMaxAgeRefreshToken: 3600,
            registration: false,
            emailVerification: false,
            forgotPassword: false,
        },
        validators: {
            port: (value) => zod.number().nonnegative().safeParse(value),
            host: (value) => zod.string().safeParse(value),
            publicUrl: (value) => zod.string().url().safeParse(value),
            authorizeRedirectUrl: (value) => zod.string().url().safeParse(value),
            env: (value) => zod.string().safeParse(value),
            rootPath: (value) => zod.string().safeParse(value),
            writableDirectoryPath: (value) => zod.string().safeParse(value),
            middlewareBody: (value) => zod.boolean().or(zod.record(zod.any())).safeParse(value),
            middlewareCors: (value) => zod.boolean().or(zod.record(zod.any())).safeParse(value),
            middlewareCookie: (value) => zod.boolean().or(zod.record(zod.any())).safeParse(value),
            middlewareQuery: (value) => zod.boolean().or(zod.record(zod.any())).safeParse(value),
            middlewareSwagger: (value) => zod.boolean().safeParse(value),
            tokenMaxAgeAccessToken: (value) => zod.number().nonnegative().safeParse(value),
            tokenMaxAgeRefreshToken: (value) => zod.number().nonnegative().safeParse(value),
            registration: (value) => zod.boolean().safeParse(value),
            emailVerification: (value) => zod.boolean().safeParse(value),
            forgotPassword: (value) => zod.boolean().safeParse(value),
        },
    });
}

export function setConfig(input: Continu<Options, OptionsInput>) {
    instance = input;
}

export function unsetConfig() {
    instance = undefined;
}
