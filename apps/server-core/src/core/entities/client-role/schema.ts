/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { ClientRole } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { client: EntityType.CLIENT, role: EntityType.ROLE };

export const clientRoleSchema = defineSchema<ClientRole>({
    name: EntityType.CLIENT_ROLE,
    indexes: [
        ['id'],
        ['roleId', 'clientId'],
        ['clientId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    // see user-role schema — explicit root projection for include= decodes
    fields: {
        default: [
            'id',
            'clientId',
            'clientRealmId',
            'roleId',
            'roleRealmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['clientId', 'roleId'], indexed: true },
    relations: { allowed: ['client', 'role'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
