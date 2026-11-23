/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import {
    ClientPermissionEntity,
    ClientRoleEntity,
    IdentityProviderPermissionMappingEntity,
    IdentityProviderRoleMappingEntity,
    PermissionPolicyEntity,
    RoleAttributeEntity,
    RolePermissionEntity,
    UserPermissionEntity,
    UserRoleEntity,
} from '../../../adapters/database/domains/index.ts';
import type { IProvisioningRealmRepairer } from '../../../core/provisioning/types.ts';

type RealmColumnReference = {
    target: EntityTarget<ObjectLiteral>,
    idColumn: string,
    realmColumn: string,
};

const PERMISSION_REFERENCES: RealmColumnReference[] = [
    {
        target: RolePermissionEntity,
        idColumn: 'permissionId',
        realmColumn: 'permissionRealmId',
    },
    {
        target: UserPermissionEntity,
        idColumn: 'permissionId',
        realmColumn: 'permissionRealmId',
    },
    {
        target: ClientPermissionEntity,
        idColumn: 'permissionId',
        realmColumn: 'permissionRealmId',
    },
    {
        target: IdentityProviderPermissionMappingEntity,
        idColumn: 'permissionId',
        realmColumn: 'permissionRealmId',
    },
    {
        target: PermissionPolicyEntity,
        idColumn: 'permissionId',
        realmColumn: 'permissionRealmId',
    },
];

const ROLE_REFERENCES: RealmColumnReference[] = [
    {
        target: RolePermissionEntity,
        idColumn: 'roleId',
        realmColumn: 'roleRealmId',
    },
    {
        target: UserRoleEntity,
        idColumn: 'roleId',
        realmColumn: 'roleRealmId',
    },
    {
        target: ClientRoleEntity,
        idColumn: 'roleId',
        realmColumn: 'roleRealmId',
    },
    {
        target: IdentityProviderRoleMappingEntity,
        idColumn: 'roleId',
        realmColumn: 'roleRealmId',
    },
    {
        target: RoleAttributeEntity,
        idColumn: 'roleId',
        realmColumn: 'realmId',
    },
];

/**
 * Rows are loaded and saved one by one rather than updated in bulk, so the
 * entity subscribers see each write (cache invalidation, domain events).
 * The set is small: only rows provisioning once wrote without a realm.
 */
export class ProvisioningRealmRepairer implements IProvisioningRealmRepairer {
    protected dataSource: DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
    }

    async repairPermission(id: string, realmId: string): Promise<void> {
        await this.repair(PERMISSION_REFERENCES, id, realmId);
    }

    async repairRole(id: string, realmId: string): Promise<void> {
        await this.repair(ROLE_REFERENCES, id, realmId);
    }

    protected async repair(references: RealmColumnReference[], id: string, realmId: string): Promise<void> {
        for (const reference of references) {
            const repository = this.dataSource.getRepository(reference.target);
            const rows = await repository.findBy({ [reference.idColumn]: id });

            for (const row of rows) {
                if (row[reference.realmColumn] === realmId) {
                    continue;
                }

                row[reference.realmColumn] = realmId;

                await repository.save(row);
            }
        }
    }
}
