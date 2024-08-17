/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extendObject, makeURLPublicAccessible } from '@authup/kit';
import { defineGetter, dycraft } from 'dycraft';
import { read } from 'envix';
import path from 'node:path';
import process from 'node:process';
import { merge } from 'smob';
import { EnvironmentName, readConfigFromEnv } from './env';
import { parseConfig } from './parse';
import type { Config, ConfigBuildContext, ConfigInput } from './types';
import { type DatabaseConnectionOptions } from './utils';

export function buildConfig(
    context: ConfigBuildContext = {},
): Config {
    const config = dycraft({
        defaults: {
            env: read('NODE_ENV', EnvironmentName.DEVELOPMENT),
            rootPath: process.cwd(),
            writableDirectoryPath: path.join(process.cwd(), 'writable'),

            redis: false,
            smtp: false,
            vault: false,

            port: 3001,
            host: '0.0.0.0',
            publicUrl: 'http://127.0.0.1:3001',
            authorizeRedirectUrl: 'http://127.0.0.1:3000',
            middlewareBody: true,
            middlewareCookie: true,
            middlewareCors: true,
            middlewarePrometheus: true,
            middlewareQuery: true,
            middlewareRateLimit: true,
            middlewareSwagger: true,
            tokenRefreshMaxAge: 259_200,
            tokenAccessMaxAge: 3_600,
            registration: false,
            emailVerification: false,
            forgotPassword: false,

            clientAuthBasic: false,

            userAuthBasic: false,
            userAdminEnabled: true,
            userAdminName: 'admin',
            userAdminPassword: 'start123',
            userAdminPasswordReset: false,

            robotAuthBasic: false,
            robotAdminName: 'system',
            robotAdminEnabled: false,
            robotAdminSecretReset: false,

            permissions: [],
        } satisfies Partial<Config>,
        getters: {
            db: defineGetter((context) : DatabaseConnectionOptions => ({
                type: 'better-sqlite3',
                database: path.join(context.get('writableDirectoryPath'), 'db.sql'),
            })),
            tokenMaxAgeRefreshToken: defineGetter((context) => {
                if (
                    !context.has('tokenMaxAgeRefreshToken') &&
                    context.has('tokenMaxAgeAccessToken')
                ) {
                    return context.get('tokenMaxAgeAccessToken') * 2;
                }

                return context.get('tokenMaxAgeRefreshToken');
            }),
            publicUrl: defineGetter((context) => {
                if (
                    !context.has('publicUrl') &&
                    (context.has('host') || context.has('port'))
                ) {
                    return makeURLPublicAccessible(`http://${context.get('host')}:${context.get('port')}`);
                }

                return context.get('publicUrl');
            }),
        },
    }) as Config;

    let raw : ConfigInput;
    if (context.env) {
        raw = merge(readConfigFromEnv(), context.data || {});
    } else {
        raw = context.data || {};
    }

    return extendObject(config, parseConfig(raw));
}
