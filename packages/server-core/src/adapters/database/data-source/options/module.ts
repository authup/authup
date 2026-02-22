/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { DataSourceOptions } from 'typeorm';
import {
    CodeTransformation, isCodeTransformation, readDataSourceOptionsFromEnv, transformFilePath,
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
    PermissionSubscriber,
    PolicyAttributeEntity,
    PolicyAttributeSubscriber,
    PolicyEntity,
    PolicySubscriber,
    RealmEntity,
    RealmSubscriber,
    RobotEntity,
    RobotPermissionEntity,
    RobotPermissionSubscriber,
    RobotRoleEntity,
    RobotRoleSubscriber,
    RobotSubscriber,
    RoleAttributeEntity,
    RoleAttributeSubscriber,
    RoleEntity,
    RolePermissionEntity,
    RolePermissionSubscriber,
    RoleSubscriber,
    ScopeEntity,
    ScopeSubscriber,
    SessionEntity,
    UserAttributeEntity,
    UserAttributeSubscriber,
    UserEntity,
    UserPermissionEntity,
    UserPermissionSubscriber,
    UserRoleEntity,
    UserRoleSubscriber,
    UserSubscriber,
} from '../../domains/index.ts';

export class DataSourceOptionsBuilder {
    buildWithEnv() {
        const options = readDataSourceOptionsFromEnv();

        if (!options) {
            throw new AuthupError('The database configuration could not be read from env variables.');
        }

        return this.normalize(options);
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

                SessionEntity,

                ClientEntity,
                ClientPermissionEntity,
                ClientRoleEntity,
                ClientScopeEntity,

                IdentityProviderEntity,
                IdentityProviderAttributeEntity,
                IdentityProviderAccountEntity,
                IdentityProviderRoleMappingEntity,
                IdentityProviderPermissionMappingEntity,
                IdentityProviderAttributeMappingEntity,

                PermissionEntity,

                PolicyEntity,
                PolicyAttributeEntity,

                RealmEntity,

                RobotEntity,
                RobotPermissionEntity,
                RobotRoleEntity,

                RoleEntity,
                RoleAttributeEntity,
                RolePermissionEntity,

                ScopeEntity,

                UserEntity,
                UserAttributeEntity,
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

                IdentityProviderSubscriber,
                IdentityProviderAccountSubscriber,
                IdentityProviderAttributeSubscriber,
                IdentityProviderRoleSubscriber,

                PermissionSubscriber,
                PolicySubscriber,
                PolicyAttributeSubscriber,

                RealmSubscriber,

                RobotSubscriber,
                RobotRoleSubscriber,
                RobotPermissionSubscriber,

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
            let migrationPath = `src/adapters/database/migrations/${options.type}/*.{ts,js}`;
            if (!isCodeTransformation(CodeTransformation.JUST_IN_TIME)) {
                migrationPath = transformFilePath(migrationPath, './dist', './src');
            }

            Object.assign(options, {
                migrations: [migrationPath],
                migrationsTransactionMode: 'all',
            } as DataSourceOptions);
        }

        if (options.type === 'mysql') {
            Object.assign(options, {
                connectorPackage: 'mysql2',
            } satisfies Partial<DataSourceOptions>);
        }

        return options;
    }
}
