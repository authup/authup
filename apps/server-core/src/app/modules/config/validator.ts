/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import { createValidator } from '@validup/zod';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions.js';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions.js';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions.js';
import { Container } from 'validup';
import { z } from 'zod';
import { expandToOrigins } from './origins.ts';
import type { Config } from './types.ts';

export class ConfigValidator extends Container<Config> {
    protected override initialize() {
        super.initialize();

        const optional = { optional: true };

        const stringValidator = createValidator(z.string());
        const booleanValidator = createValidator(z.boolean());
        const nonNegativeNumberValidator = createValidator(z.number().nonnegative());
        const secretValidator = createValidator(z.string().min(3).max(256));
        const middlewareValidator = createValidator(
            z.boolean().or(z.record(z.string(), z.any())),
        );

        this.mount('env', optional, stringValidator);
        this.mount('rootPath', optional, stringValidator);
        this.mount('writableDirectoryPath', optional, stringValidator);

        this.mount('logger', optional, booleanValidator);
        this.mount('db', optional, createValidator(
            z.custom<MysqlConnectionOptions | PostgresConnectionOptions | BetterSqlite3ConnectionOptions>(
                (value) => isObject(value),
            ),
        ));
        this.mount('redis', optional, createValidator(z.any()));
        this.mount('smtp', optional, createValidator(z.any()));

        this.mount('port', optional, nonNegativeNumberValidator);
        this.mount('host', optional, stringValidator);
        this.mount('publicUrl', optional, createValidator(z.url()));
        this.mount('trustedOrigins', optional, createValidator(
            z.array(z.string().refine((value) => {
                try {
                    expandToOrigins(value);
                    return true;
                } catch {
                    return false;
                }
            }, 'must be an origin (incl. protocol) or a bare host[:port]')),
        ));

        this.mount('middlewareBody', optional, middlewareValidator);
        this.mount('middlewareCors', optional, middlewareValidator);
        this.mount('middlewareCookie', optional, middlewareValidator);
        this.mount('middlewareQuery', optional, middlewareValidator);
        this.mount('middlewarePrometheus', optional, middlewareValidator);
        this.mount('middlewareRateLimit', optional, middlewareValidator);
        this.mount('middlewareSwagger', optional, booleanValidator);

        this.mount('tokenAccessMaxAge', optional, nonNegativeNumberValidator);
        this.mount('tokenRefreshMaxAge', optional, nonNegativeNumberValidator);
        this.mount('registrationEnabled', optional, booleanValidator);
        this.mount('emailVerificationEnabled', optional, booleanValidator);
        this.mount('passwordRecoveryEnabled', optional, booleanValidator);

        this.mount('clientAuthBasic', optional, booleanValidator);
        this.mount('clientSystemEnabled', optional, booleanValidator);
        this.mount('clientSystemSecret', optional, secretValidator);
        this.mount('clientSystemSecretReset', optional, booleanValidator);

        this.mount('userAuthBasic', optional, booleanValidator);
        this.mount('userAdminEnabled', optional, booleanValidator);
        this.mount('userAdminPassword', optional, secretValidator);
        this.mount('userAdminPasswordReset', optional, booleanValidator);

        this.mount('robotAuthBasic', optional, booleanValidator);
        this.mount('robotAdminEnabled', optional, booleanValidator);
        this.mount('robotAdminSecret', optional, secretValidator);
        this.mount('robotAdminSecretReset', optional, booleanValidator);

        this.mount('permissions', optional, createValidator(
            z.string().or(z.array(z.string())),
        ));
        this.mount('permissionsDefaultPolicyAssignment', optional, booleanValidator);
    }
}
