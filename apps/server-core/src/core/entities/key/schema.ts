/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Key } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { realm: EntityType.REALM };

export const keySchema = defineSchema<Key>({
    name: EntityType.KEY,
    fields: {
        default: [
            'id',
            'name',
            'type',
            'use',
            'priority',
            'status',
            'signatureAlgorithm',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
        allowed: ['encryptionKey', 'certificate'],
    },
    filters: {
        allowed: [
            'id',
            'name',
            'type',
            'use',
            'status',
            'realmId',
        ], 
    },
    relations: { allowed: ['realm'], validate: createRelationsReadGate(schemaMapping) },
    sort: {
        allowed: [
            'id',
            'name',
            'priority',
            'use',
            'status',
            'createdAt',
            'updatedAt',
        ],
    },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
