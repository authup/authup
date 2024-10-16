/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'envix';
import path from 'node:path';
import process from 'node:process';
import { EnvironmentName } from '../env';
import { ConfigDefaults } from './constants';
import { parseConfig } from './parse';
import type { Config, ConfigInput } from './types';

export function normalizeConfig(input: ConfigInput = {}): Config {
    const parsed = parseConfig(input);

    const writableDirectoryPath = parsed.writableDirectoryPath ||
        path.join(process.cwd(), 'writable');

    return {
        env: read('NODE_ENV', EnvironmentName.DEVELOPMENT),
        rootPath: process.cwd(),
        writableDirectoryPath,

        logger: true,
        redis: false,
        smtp: false,
        vault: false,

        port: Number(ConfigDefaults.PORT),
        host: `${ConfigDefaults.HOST}`,
        publicUrl: `${ConfigDefaults.PUBLIC_URL}`,
        authorizeRedirectUrl: `${ConfigDefaults.AUTHORIZE_REDIRECT_URL}`,

        db: {
            type: 'better-sqlite3',
            database: path.join(writableDirectoryPath, 'db.sql'),
        },

        middlewareBody: true,
        middlewareCookie: true,
        middlewareCors: true,
        middlewarePrometheus: true,
        middlewareQuery: true,
        middlewareRateLimit: true,
        middlewareSwagger: true,
        tokenRefreshMaxAge: Number(ConfigDefaults.TOKEN_REFRESH_MAG_AGE),
        tokenAccessMaxAge: Number(ConfigDefaults.TOKEN_ACCESS_MAX_AGE),
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
        ...parsed,
    };
}
