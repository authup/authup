/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { RolePermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { role: EntityType.ROLE, permission: EntityType.PERMISSION };

export const rolePermissionSchema = defineSchema<RolePermission>({
    name: EntityType.ROLE_PERMISSION,
    indexes: [
        ['id'],
        ['permissionId', 'roleId'],
        ['roleId'],
        ['roleRealmId'],
        ['permissionRealmId'],
        ['policyId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    // see user-role schema — explicit root projection for include= decodes
    fields: {
        default: [
            'id',
            'policyId',
            'realmScope',
            'permissionId',
            'permissionRealmId',
            'roleId',
            'roleRealmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['roleId', 'permissionId', 'id', 'roleRealmId', 'permissionRealmId', 'policyId'], indexed: true },
    relations: { allowed: ['role', 'permission'], validate: createRelationsReadGate(schemaMapping) },
    sorts: { allowed: ['id', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
