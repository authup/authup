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

    const env = read('NODE_ENV', EnvironmentName.DEVELOPMENT);

    // In non-production (development & test) client-web runs on :3000 while
    // the API (publicUrl) runs on :3001. Seed :3000 into the trusted origins
    // so the redirect allowlist (<origin>/**) and CORS accept logins from the
    // dev UI out of the box; otherwise the realm-selection login is dead on
    // first run.
    const additionalDomains = parsed.additionalDomains ?? [];
    if (env !== EnvironmentName.PRODUCTION) {
        const devOrigin = 'http://localhost:3000';
        if (!additionalDomains.includes(devOrigin)) {
            additionalDomains.push(devOrigin);
        }
    }

    return {
        env,
        rootPath: process.cwd(),
        writableDirectoryPath,

        logger: true,
        redis: false,
        smtp: false,

        port,
        host,
        publicUrl,

        middlewareBody: true,
        middlewareCookie: true,
        middlewareCors: true,
        middlewarePrometheus: true,
        middlewareQuery: true,
        middlewareRateLimit: true,
        middlewareSwagger: true,
        tokenRefreshMaxAge: 259_200,
        tokenAccessMaxAge: 3_600,
        registrationEnabled: false,
        emailVerificationEnabled: false,
        passwordRecoveryEnabled: false,

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
        permissionsDefaultPolicyAssignment: true,
        ...parsed,

        // After the spread so the dev-seeded value wins over the raw
        // parsed list (parsed.additionalDomains is already merged in above).
        additionalDomains,
    };
}
