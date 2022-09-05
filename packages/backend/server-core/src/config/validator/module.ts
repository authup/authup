/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import zod from 'zod';
import { Client } from 'redis-extension';
import { Config } from '../type';

const configRedisValidation : zod.ZodType<string | boolean | Client> = zod.lazy(() => zod.union([
    zod.string(),
    zod.boolean(),
    zod.any(),
]));

const configValidation = zod.object({
    env: zod.string(),
    port: zod.number(),
    selfUrl: zod.string().url(),
    webUrl: zod.string().url(),
    rootPath: zod.string(),
    writableDirectoryPath: zod.string(),
    tokenMaxAgeAccessToken: zod.number().nonnegative(),
    tokenMaxAgeRefreshToken: zod.number().nonnegative(),
    redis: configRedisValidation,
    adminUsername: zod.string().min(3).max(128),
    adminPassword: zod.string().min(3).max(256),
    adminPasswordReset: zod.boolean().optional(),
    robotEnabled: zod.boolean(),
    robotSecret: zod.string().min(3).max(256),
    robotSecretReset: zod.boolean().optional(),
    permissions: zod.string().array().optional(),

    keyPairPassphrase: zod.string().min(3).max(256).optional(),
    KeyPairPrivateName: zod.string().min(3).max(256).optional(),
    keyPairPrivateExtension: zod.string().min(3).max(10).optional(),

    middlewareBodyParser: zod.boolean(),
    middlewareCookieParser: zod.boolean(),
    middlewareResponse: zod.boolean(),
    middlewareSwaggerEnabled: zod.boolean(),
    middlewareSwaggerDirectoryPath: zod.string(),
});

export function validateConfig(input: unknown) : Partial<Config> {
    return configValidation.partial().parse(input);
}
