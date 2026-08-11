/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Scope } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { realm: EntityType.REALM };

export const scopeSchema = defineSchema<Scope>({
    name: EntityType.SCOPE,
    indexes: [
        ['id'],
        ['name', 'realmId'],
        ['builtIn'],
        ['realmId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    fields: {
        allowed: [
            'id',
            'builtIn',
            'name',
            'displayName',
            'description',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['id', 'builtIn', 'name', 'realmId'], indexed: true },
    relations: { allowed: ['realm'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['id', 'name', 'updatedAt', 'createdAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
