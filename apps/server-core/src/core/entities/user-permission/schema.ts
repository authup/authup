/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { UserPermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { user: EntityType.USER, permission: EntityType.PERMISSION };

export const userPermissionSchema = defineSchema<UserPermission>({
    name: EntityType.USER_PERMISSION,
    indexes: [
        ['id'],
        ['permissionId', 'userId'],
        ['userId'],
        ['userRealmId'],
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
            'userId',
            'userRealmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['userId', 'permissionId', 'id', 'userRealmId', 'permissionRealmId', 'policyId'], indexed: true },
    relations: { allowed: ['user', 'permission'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
