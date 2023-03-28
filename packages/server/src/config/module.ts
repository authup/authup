/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Continu } from 'continu';
import path from 'node:path';
import process from 'node:process';
import zod from 'zod';
import type { Config, Options, OptionsInput } from './type';

let instance : Config | undefined;

export function useConfig() : Config {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = createConfig();

    return instance;
}

export function unsetConfig() {
    if (typeof instance === 'undefined') {
        return;
    }

    instance = undefined;
}

export function createConfig() : Config {
    return new Continu<Options, OptionsInput>({
        defaults: {
            env: process.env.NODE_ENV || 'development',
            rootPath: process.cwd(),
            writableDirectoryPath: path.join(process.cwd(), 'writable'),

            redis: false,
            smtp: false,
            vault: false,

            port: 3010,
            host: '0.0.0.0',
            publicUrl: 'http://127.0.0.1:3010',
            authorizeRedirectUrl: 'http://127.0.0.1:3000',
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

            adminUsername: 'admin',
            adminPassword: 'start123',
            robotEnabled: false,
            permissions: [],

        },
        validators: {
            env: (value) => zod.string().safeParse(value),
            rootPath: (value) => zod.string().safeParse(value),
            writableDirectoryPath: (value) => zod.string().safeParse(value),

            redis: (value) => zod.lazy(() => zod.union([
                zod.string(),
                zod.boolean(),
                zod.any(),
            ])),
            smtp: (value) => zod.lazy(() => zod.union([
                zod.string(),
                zod.boolean(),
                zod.any(),
            ])),
            vault: (value) => zod.lazy(() => zod.union([
                zod.string(),
                zod.boolean(),
                zod.any(),
            ])),

            port: (value) => zod.number().nonnegative().safeParse(value),
            host: (value) => zod.string().safeParse(value),
            publicUrl: (value) => zod.string().url().safeParse(value),
            authorizeRedirectUrl: (value) => zod.string().url().safeParse(value),
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

            adminUsername: (value) => zod.string().min(3).max(128).safeParse(value),
            adminPassword: (value) => zod.string().min(3).max(256).safeParse(value),
            adminPasswordReset: (value) => zod.boolean().safeParse(value),
            robotEnabled: (value) => zod.boolean().safeParse(value),
            robotSecret: (value) => zod.string().min(3).max(256).safeParse(value),
            robotSecretReset: (value) => zod.boolean().safeParse(value),
        },
        transformers: {
            permissions: (value) => {
                if (Array.isArray(value)) {
                    return value;
                }

                if (typeof value === 'string') {
                    return value.split(',');
                }

                return [];
            },
        },
    });
}
