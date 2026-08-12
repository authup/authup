/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { ClientPermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { client: EntityType.CLIENT, permission: EntityType.PERMISSION };

export const clientPermissionSchema = defineSchema<ClientPermission>({
    name: EntityType.CLIENT_PERMISSION,
    indexes: [
        ['id'],
        ['clientId', 'permissionId'],
        ['permissionId'],
        ['clientRealmId'],
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
            'clientId',
            'clientRealmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['clientId', 'permissionId', 'id', 'clientRealmId', 'permissionRealmId', 'policyId'], indexed: true },
    relations: { allowed: ['client', 'permission'], validate: createRelationsReadGate(schemaMapping) },
    sorts: { allowed: ['id', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
