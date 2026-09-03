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

export class DataSourceOptionsBuilder {
    buildWithEnv() {
        const options = readDataSourceOptionsFromEnv();

        if (!options) {
            throw new AuthupError('No database is configured. Set DB_TYPE to "postgres" or "mysql", together with DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD and DB_DATABASE.');
        }

        return this.normalize(options);
    }

    // the application boot path: the `db` config key documents the
    // better-sqlite3 driver default, and DatabaseModule refuses that driver in
    // production downstream. buildWithEnv stays strict for the migration CLI
    // and the CI scripts, which apply no environment check and would otherwise
    // silently target sqlite and report nothing to do.
    buildWithEnvOrDefault() {
        return this.normalize(readDataSourceOptionsFromEnv() ?? { type: 'better-sqlite3', database: 'db.sqlite' });
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
