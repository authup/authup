/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { PermissionPolicy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { permission: EntityType.PERMISSION, policy: EntityType.POLICY };

export const permissionPolicySchema = defineSchema<PermissionPolicy>({
    name: EntityType.PERMISSION_POLICY,
    // see user-role schema — explicit root projection for include= decodes
    fields: {
        default: [
            'id',
            'permissionId',
            'permissionRealmId',
            'policyId',
            'policyRealmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['permissionId', 'policyId'] },
    relations: { allowed: ['permission', 'policy'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
