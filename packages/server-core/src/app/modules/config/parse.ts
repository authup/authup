/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information.optional(),
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions.js';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions.js';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions.js';
import zod from 'zod';
import type { Config, ConfigInput } from './types';

export function parseConfig(input: unknown = {}): ConfigInput {
    const schema = zod.object({
        env: zod.string().optional(),
        rootPath: zod.string().optional(),
        writableDirectoryPath: zod.string().optional(),

        logger: zod.boolean().optional(),
        db: zod.custom< MysqlConnectionOptions | PostgresConnectionOptions | BetterSqlite3ConnectionOptions>(
            (value) => isObject(value),
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
        cookieDomain: zod.string().optional(),
        middlewareBody: zod.boolean()
            .or(zod.record(zod.string(), zod.any())).optional(),
        middlewareCors: zod.boolean()
            .or(zod.record(zod.string(), zod.any())).optional(),
        middlewareCookie: zod.boolean()
            .or(zod.record(zod.string(), zod.any())).optional(),
        middlewareQuery: zod.boolean()
            .or(zod.record(zod.string(), zod.any())).optional(),
        middlewarePrometheus: zod.boolean()
            .or(zod.record(zod.string(), zod.any())).optional(),
        middlewareRateLimit: zod.boolean()
            .or(zod.record(zod.string(), zod.any())).optional(),
        middlewareSwagger: zod.boolean().optional(),

        tokenAccessMaxAge: zod.number()
            .nonnegative().optional(),
        tokenRefreshMaxAge: zod.number()
            .nonnegative().optional(),
        registration: zod.boolean().optional(),
        emailVerification: zod.boolean().optional(),
        forgotPassword: zod.boolean().optional(),

        clientAuthBasic: zod.boolean().optional(),

        userAuthBasic: zod.boolean().optional(),
        userAdminEnabled: zod.boolean().optional(),
        userAdminName: zod.string()
            .min(3)
            .max(128)
            .optional(),
        userAdminPassword: zod.string()
            .min(3)
            .max(256).optional(),
        userAdminPasswordReset: zod.boolean().optional(),

        robotAuthBasic: zod.boolean().optional(),
        robotAdminEnabled: zod.boolean().optional(),
        robotAdminName: zod.string()
            .min(3)
            .max(128)
            .optional(),
        robotAdminSecret: zod.string()
            .min(3)
            .max(256).optional(),
        robotAdminSecretReset: zod.boolean().optional(),

        permissions: zod.string()
            .or(zod.array(zod.string()))
            .optional(),
    } satisfies Record<keyof Config, any>);

    return schema.parse(input);
}
