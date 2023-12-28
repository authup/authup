/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information.optional(),
 * view the LICENSE file that was distributed with this source code.
 */

import zod from 'zod';
import type { ConfigInput } from './type';
import type { DatabaseConnectionOptions } from './utils';
import { isDatabaseConnectionConfiguration, isDatabaseConnectionConfigurationSupported } from './utils';

export function parseConfig(input: unknown): ConfigInput {
    const schema = zod.object({
        env: zod.string().optional(),
        rootPath: zod.string().optional(),
        writableDirectoryPath: zod.string().optional(),

        db: zod.custom<DatabaseConnectionOptions>(
            (value) => isDatabaseConnectionConfiguration(value) &&
                isDatabaseConnectionConfigurationSupported(value),
        ).optional(),
        redis: zod.lazy(() => zod.union([
            zod.string().optional(),
            zod.boolean().optional(),
            zod.any().optional(),
        ])).optional(),
        smtp: zod.lazy(() => zod.union([
            zod.string().optional(),
            zod.boolean().optional(),
            zod.any().optional(),
        ])).optional(),
        vault: zod.lazy(() => zod.union([
            zod.string().optional(),
            zod.boolean().optional(),
            zod.any().optional(),
        ])).optional(),

        port: zod.number()
            .nonnegative().optional(),
        host: zod.string().optional(),
        publicUrl: zod.string()
            .url().optional(),
        authorizeRedirectUrl: zod.string()
            .url().optional(),
        middlewareBody: zod.boolean()
            .or(zod.record(zod.any())).optional(),
        middlewareCors: zod.boolean()
            .or(zod.record(zod.any())).optional(),
        middlewareCookie: zod.boolean()
            .or(zod.record(zod.any())).optional(),
        middlewareQuery: zod.boolean()
            .or(zod.record(zod.any())).optional(),
        middlewareSwagger: zod.boolean().optional(),
        tokenMaxAgeAccessToken: zod.number()
            .nonnegative().optional(),
        tokenMaxAgeRefreshToken: zod.number()
            .nonnegative().optional(),
        registration: zod.boolean().optional(),
        emailVerification: zod.boolean().optional(),
        forgotPassword: zod.boolean().optional(),

        adminUsername: zod.string()
            .min(3)
            .max(128).optional(),
        adminPassword: zod.string()
            .min(3)
            .max(256).optional(),
        adminPasswordReset: zod.boolean().optional(),
        robotEnabled: zod.boolean().optional(),
        robotSecret: zod.string()
            .min(3)
            .max(256).optional(),
        robotSecretReset: zod.boolean().optional(),
    });

    return schema.parse(input);
}
