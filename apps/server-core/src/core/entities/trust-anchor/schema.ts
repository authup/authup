/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { TrustAnchor } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { realm: EntityType.REALM };

export const trustAnchorSchema = defineSchema<TrustAnchor>({
    name: EntityType.TRUST_ANCHOR,
    indexes: [
        ['id'],
        ['name', 'realmId'],
        ['enabled'],
        ['realmId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    fields: {
        allowed: [
            'id',
            'name',
            'certificate',
            'enabled',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['id', 'name', 'enabled', 'realmId'], indexed: true },
    relations: { allowed: ['realm'], validate: createRelationsReadGate(schemaMapping) },
    sorts: { allowed: ['id', 'name', 'enabled', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
