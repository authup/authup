/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { RoleAttribute } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { role: EntityType.ROLE, realm: EntityType.REALM };

export const roleAttributeSchema = defineSchema<RoleAttribute>({
    name: EntityType.ROLE_ATTRIBUTE,
    // see user-role schema — explicit root projection for include= decodes
    fields: {
        default: [
            'id',
            'name',
            'value',
            'roleId',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['id', 'name', 'roleId', 'realmId'] },
    relations: { allowed: ['role', 'realm'], validate: createRelationsReadGate(schemaMapping) },
    sort: {
        allowed: [
            'id',
            'name',
            'roleId',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
