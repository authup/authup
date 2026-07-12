/*
 * Copyright (c) 2023-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'envix';
import path from 'node:path';
import process from 'node:process';
import { USER_PASSWORD_MIN_LENGTH } from '@authup/core-kit';
import { AuthupError } from '@authup/errors';
import { EnvironmentName } from '@authup/kit';
import { toPublicHost } from '../../../utils/host.ts';
import { expandToOrigins } from './origins.ts';
import { parseConfig } from './parse.ts';
import type { Config, ConfigInput } from './types.ts';

export async function normalizeConfig(input: ConfigInput = {}): Promise<Config> {
    const parsed = await parseConfig(input);

    const writableDirectoryPath = parsed.writableDirectoryPath ||
        path.join(process.cwd(), 'writable');

    const port = parsed.port ?? 3001;
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

    const env = parsed.env || read('NODE_ENV', EnvironmentName.DEVELOPMENT);

    // Canonicalize to bare origins (scheme://host[:port]) — a scheme-less
    // entry (e.g. `hub.local`) expands to both its http and https origin.
    // Downstream consumers (redirect allowlist, getAppOrigins) can rely on
    // every entry being a full origin. Building a fresh array also keeps a
    // repeated normalizeConfig() on the same input from accumulating the
    // dev origin into a security-sensitive allowlist.
    const trustedOrigins: string[] = [];
    for (const value of parsed.trustedOrigins ?? []) {
        for (const origin of expandToOrigins(value)) {
            if (!trustedOrigins.includes(origin)) {
                trustedOrigins.push(origin);
            }
        }
    }

    // In non-production (development & test) client-web runs on :3000 while
    // the API (publicUrl) runs on :3001. Seed :3000 into the trusted origins
    // so the redirect allowlist (<origin>/**) and CORS accept logins from the
    // dev UI out of the box; otherwise the realm-selection login is dead on
    // first run.
    if (env !== EnvironmentName.PRODUCTION) {
        const devOrigin = 'http://localhost:3000';
        if (!trustedOrigins.includes(devOrigin)) {
            trustedOrigins.push(devOrigin);
        }
    }

    const config : Config = {
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
        tokenAccessMaxAge: 900,
        tokenRefreshGracePeriod: 0,
        promptLoginMaxAge: 60,
        endSessionHintGracePeriod: 0,
        registrationEnabled: false,
        emailVerificationEnabled: false,
        passwordRecoveryEnabled: false,
        passwordMinLength: USER_PASSWORD_MIN_LENGTH,

        eventLogEnabled: true,
        eventLogRetentionDays: 365,
        eventLogEntityEnabled: true,
        eventLogEntityRetentionDays: 7,
        loginAttemptThrottleEnabled: false,
        loginAttemptThreshold: 5,
        loginAttemptWindow: 900,

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

        // After the spread so the canonicalized + dev-seeded list wins over
        // the raw parsed list (parsed.trustedOrigins is merged in above).
        trustedOrigins,
    };

    // fail loud at boot: the throttle counts loginFailed rows in
    // auth_events — with the audit log disabled it would silently no-op.
    if (config.loginAttemptThrottleEnabled && !config.eventLogEnabled) {
        throw new AuthupError('loginAttemptThrottleEnabled requires eventLogEnabled.');
    }

    return config;
}
