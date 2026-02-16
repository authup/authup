/*
 * Copyright (c) 2023-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'envix';
import path from 'node:path';
import process from 'node:process';
import { EnvironmentName } from '@authup/kit';
import { toPublicHost } from '../../../utils/host.ts';
import { parseConfig } from './parse.ts';
import type { Config, ConfigInput } from './types.ts';

export function normalizeConfig(input: ConfigInput = {}): Config {
    const parsed = parseConfig(input);

    const writableDirectoryPath = parsed.writableDirectoryPath ||
        path.join(process.cwd(), 'writable');

    const port = parsed.port || 3001;
    let host = parsed.host || '0.0.0.0';

    let publicUrl : string;
    if (parsed.publicUrl) {
        publicUrl = parsed.publicUrl;
    } else {
        const regex = /^([^:]+)(?::(\d+))?$/;
        const match = host.match(regex);
        if (match) {
            [, host] = match;
            publicUrl = `http://${toPublicHost(host)}:${match[2] || port}`;
        } else {
            publicUrl = `http://${toPublicHost(host)}:${port}`;
        }
    }

    return {
        env: read('NODE_ENV', EnvironmentName.DEVELOPMENT),
        rootPath: process.cwd(),
        writableDirectoryPath,

        logger: true,
        redis: false,
        smtp: false,
        vault: false,

        port,
        host,
        publicUrl,

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
        tokenRefreshMaxAge: 259_200,
        tokenAccessMaxAge: 3_600,
        registration: false,
        emailVerification: false,
        forgotPassword: false,

        clientAuthBasic: false,
        clientSystemEnabled: false,
        clientSystemSecret: 'start123',
        clientSystemSecretReset: false,

        userAuthBasic: false,
        userAdminEnabled: true,
        userAdminPassword: 'start123',
        userAdminPasswordReset: false,

        robotAuthBasic: false,
        robotAdminEnabled: false,
        robotAdminSecret: 'start123',
        robotAdminSecretReset: false,

        permissions: [],
        ...parsed,
    };
}
