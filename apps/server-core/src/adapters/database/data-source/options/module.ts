/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import path from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import {
    CodeTransformation,
    isCodeTransformation,
    readDataSourceOptionsFromEnv,
    useEnv,
} from 'typeorm-extension';
import {
    ClientEntity,
    ClientPermissionEntity,
    ClientPermissionSubscriber,
    ClientRoleEntity,
    ClientRoleSubscriber,
    ClientScopeEntity,
    ClientScopeSubscriber,
    ClientSubscriber,
    ConsentEntity,
    ConsentEntitySubscriber,
    EventEntity,
    IdentityProviderAccountEntity,
    IdentityProviderAccountSubscriber,
    IdentityProviderAttributeEntity,
    IdentityProviderAttributeMappingEntity,
    IdentityProviderAttributeSubscriber,
    IdentityProviderEntity,
    IdentityProviderPermissionMappingEntity,
    IdentityProviderRoleMappingEntity,
    IdentityProviderRoleSubscriber,
    IdentityProviderSubscriber,
    KeyEntity,
    PermissionEntity,
    PermissionPolicyEntity,
    PermissionSubscriber,
    PolicyAttributeEntity,
    PolicyAttributeSubscriber,
    PolicyEntity,
    PolicySubscriber,
    RealmEntity,
    RealmSubscriber,
    RoleAttributeEntity,
    RoleAttributeSubscriber,
    RoleEntity,
    RolePermissionEntity,
    RolePermissionSubscriber,
    RoleSubscriber,
    ScopeEntity,
    ScopeSubscriber,
    SessionEntity,
    SessionTokenEntity,
    TrustAnchorEntity,
    UserAttributeEntity,
    UserAttributeSubscriber,
    UserAuthenticatorEntity,
    UserEntity,
    UserPermissionEntity,
    UserPermissionSubscriber,
    UserRoleEntity,
    UserRoleSubscriber,
    UserSubscriber,
} from '../../domains/index.ts';
import { DIST_PATH, SRC_PATH } from '../../../../path.ts';

const NO_DATABASE_CONFIGURED = 'No database is configured. Set DB_TYPE to "postgres" or "mysql", together with DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD and DB_DATABASE.';

/**
 * Whether the environment names a database connection without naming a driver.
 *
 * `readDataSourceOptionsFromEnv` reports the TYPE alone, so it answers nothing
 * for an environment that carries every credential but no `DB_TYPE`. Read the
 * connection keys through typeorm-extension's own reader rather than a local
 * key list, so this cannot drift from what it accepts (each one is `DB_*` or
 * its `TYPEORM_*` alias). The list-valued keys are excluded deliberately: they
 * default to `[]` and would report every environment as configured.
 */
function hasDatabaseConnectionEnv() : boolean {
    const env = useEnv();

    return typeof env.url !== 'undefined' ||
        typeof env.host !== 'undefined' ||
        typeof env.port !== 'undefined' ||
        typeof env.username !== 'undefined' ||
        typeof env.password !== 'undefined' ||
        typeof env.database !== 'undefined';
}

export class DataSourceOptionsBuilder {
    buildWithEnv() {
        const options = readDataSourceOptionsFromEnv();

        if (!options) {
            throw new AuthupError(NO_DATABASE_CONFIGURED);
        }

        return this.normalize(options);
    }

    // the application boot path: the `db` config key documents the
    // better-sqlite3 driver default, and DatabaseModule refuses that driver in
    // production downstream. buildWithEnv stays strict for the migration CLI
    // and the CI scripts, which apply no environment check and would otherwise
    // silently target sqlite and report nothing to do.
    buildWithEnvOrDefault() {
        const options = readDataSourceOptionsFromEnv();
        if (options) {
            return this.normalize(options);
        }

        // The default answers "nothing is configured", never a half-written
        // configuration: a `DB_HOST` or `DB_DATABASE` left without a `DB_TYPE`
        // would otherwise redirect every write to a local file, silently
        // outside production.
        if (hasDatabaseConnectionEnv()) {
            throw new AuthupError(NO_DATABASE_CONFIGURED);
        }

        return this.normalize({ type: 'better-sqlite3', database: 'db.sqlite' });
    }

    buildWith(options: DataSourceOptions) {
        return this.normalize(options);
    }

    // ------------------------------------------------------------------

    protected normalize(options: DataSourceOptions) : DataSourceOptions {
        if (
            options.type !== 'mysql' &&
            options.type !== 'postgres' &&
            options.type !== 'better-sqlite3'
        ) {
            throw new AuthupError(`The database type ${options.type} is not supported.`);
        }

        options = {
            ...options,
            logging: false,
            entities: [
                ...(options.entities ? options.entities : []) as string[],
                KeyEntity,

                EventEntity,

                SessionEntity,
                SessionTokenEntity,

                TrustAnchorEntity,

                ClientEntity,
                ClientPermissionEntity,
                ClientRoleEntity,
                ClientScopeEntity,

                ConsentEntity,

                IdentityProviderEntity,
                IdentityProviderAttributeEntity,
                IdentityProviderAccountEntity,
                IdentityProviderRoleMappingEntity,
                IdentityProviderPermissionMappingEntity,
                IdentityProviderAttributeMappingEntity,

                PermissionEntity,
                PermissionPolicyEntity,

                PolicyEntity,
                PolicyAttributeEntity,

                RealmEntity,


                RoleEntity,
                RoleAttributeEntity,
                RolePermissionEntity,

                ScopeEntity,

                UserEntity,
                UserAttributeEntity,
                UserAuthenticatorEntity,
                UserPermissionEntity,
                UserRoleEntity,
            ],
            migrations: [],
            migrationsTransactionMode: 'each',
            subscribers: [
                ...(options.subscribers || []) as string[],
                ClientSubscriber,
                ClientPermissionSubscriber,
                ClientRoleSubscriber,
                ClientScopeSubscriber,

                ConsentEntitySubscriber,

                IdentityProviderSubscriber,
                IdentityProviderAccountSubscriber,
                IdentityProviderAttributeSubscriber,
                IdentityProviderRoleSubscriber,

                PermissionSubscriber,
                PolicySubscriber,
                PolicyAttributeSubscriber,

                RealmSubscriber,


                RoleSubscriber,
                RoleAttributeSubscriber,
                RolePermissionSubscriber,

                ScopeSubscriber,

                UserSubscriber,
                UserAttributeSubscriber,
                UserPermissionSubscriber,
                UserRoleSubscriber,
            ],
        };

        if (
            options.type === 'mysql' ||
            options.type === 'postgres'
        ) {
            const migrationRoot = isCodeTransformation(CodeTransformation.JUST_IN_TIME) ?
                SRC_PATH :
                DIST_PATH;
            const migrationPath = [
                migrationRoot.split(path.sep).join('/'),
                'adapters/database/migrations',
                options.type,
                '*.{ts,js,mjs}',
            ].join('/');

            Object.assign(options, {
                migrations: [migrationPath],
                migrationsTransactionMode: 'all',
            } as DataSourceOptions);
        }

        return options;
    }
}
