/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { USER_PASSWORD_MAX_LENGTH } from '@authup/core-kit';
import { isObject } from '@authup/kit';
import { createValidator } from '@validup/zod';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions.js';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions.js';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions.js';
import type { ValidatorDescriptor } from 'validup';
import { Container } from 'validup';
import { z } from 'zod';
import { expandToOrigins } from './origins.ts';
import type { Config } from './types.ts';
import { CERTIFICATE_SOURCES } from '../../../adapters/http/request/index.ts';

export class ConfigValidator extends Container<Config> {
    protected override initialize() {
        super.initialize();

        const stringValidator = createValidator(z.string());
        const booleanValidator = createValidator(z.boolean());
        const nonNegativeNumberValidator = createValidator(z.number().nonnegative());
        const secretValidator = createValidator(z.string().min(3).max(256));
        const middlewareValidator = createValidator(
            z.boolean().or(z.record(z.string(), z.any())),
        );
        const serviceValidator = createValidator(
            z.string()
                .or(z.boolean())
                .or(z.custom<Record<string, any>>((value) => isObject(value))),
        );

        // Record<keyof Config, ...> is the compile-time exhaustiveness
        // guard: a Config key without a validator here fails the build
        // instead of being silently stripped by run().
        const validators: Record<keyof Config, ValidatorDescriptor> = {
            env: stringValidator,
            rootPath: stringValidator,
            writableDirectoryPath: stringValidator,

            logger: booleanValidator,
            db: createValidator(
                z.custom<MysqlConnectionOptions | PostgresConnectionOptions | BetterSqlite3ConnectionOptions>(
                    (value) => isObject(value),
                ),
            ),
            redis: serviceValidator,
            smtp: serviceValidator,

            port: nonNegativeNumberValidator,
            host: stringValidator,
            publicUrl: createValidator(z.url()),
            mtlsPublicUrl: createValidator(z.url().nullable()),
            certificateSource: createValidator(z.enum(CERTIFICATE_SOURCES)),
            trustedOrigins: createValidator(
                z.array(z.string().refine((value) => {
                    try {
                        expandToOrigins(value);
                        return true;
                    } catch {
                        return false;
                    }
                }, 'must be a http(s) origin or a bare host[:port]')),
            ),

            middlewareBody: middlewareValidator,
            middlewareCors: middlewareValidator,
            middlewareCookie: middlewareValidator,
            middlewareQuery: middlewareValidator,
            middlewarePrometheus: middlewareValidator,
            middlewareRateLimit: middlewareValidator,
            middlewareSwagger: booleanValidator,

            tokenAccessMaxAge: nonNegativeNumberValidator,
            tokenRefreshMaxAge: nonNegativeNumberValidator,
            tokenRefreshGracePeriod: nonNegativeNumberValidator,
            promptLoginMaxAge: nonNegativeNumberValidator,
            endSessionHintGracePeriod: nonNegativeNumberValidator,
            registrationEnabled: booleanValidator,
            emailVerificationEnabled: booleanValidator,
            passwordRecoveryEnabled: booleanValidator,
            passwordMinLength: createValidator(
                z.number().int().positive().max(USER_PASSWORD_MAX_LENGTH),
            ),

            eventLogEnabled: booleanValidator,
            eventLogRetentionDays: nonNegativeNumberValidator,
            eventLogEntityEnabled: booleanValidator,
            eventLogEntityRetentionDays: nonNegativeNumberValidator,
            loginAttemptThrottleEnabled: booleanValidator,
            loginAttemptThreshold: createValidator(z.number().int().positive()),
            loginAttemptWindow: createValidator(z.number().int().positive()),

            // '' = unset; otherwise a base64 string (normalizeConfig enforces
            // the decoded 32-byte length at boot).
            secretsEncryptionKey: createValidator(z.union([z.literal(''), z.base64()])),

            mfaEnabled: booleanValidator,
            mfaRequired: booleanValidator,
            mfaFreshnessMaxAge: nonNegativeNumberValidator,
            mfaTicketMaxAge: createValidator(z.number().int().positive()),

            clientAuthBasic: booleanValidator,
            clientSystemEnabled: booleanValidator,
            clientSystemSecret: secretValidator,
            clientSystemSecretReset: booleanValidator,

            userAuthBasic: booleanValidator,
            userAdminEnabled: booleanValidator,
            userAdminPassword: secretValidator,
            userAdminPasswordReset: booleanValidator,

            robotAuthBasic: booleanValidator,
            robotAdminEnabled: booleanValidator,
            robotAdminSecret: secretValidator,
            robotAdminSecretReset: booleanValidator,

            permissions: createValidator(
                z.string().or(z.array(z.string())),
            ),
            permissionsDefaultPolicyAssignment: booleanValidator,
        };

        const keys = Object.keys(validators) as (keyof Config)[];
        for (const key of keys) {
            this.mount(key, { optional: true }, validators[key]);
        }
    }
}
