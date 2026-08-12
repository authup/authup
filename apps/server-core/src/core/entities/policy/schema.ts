/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Policy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { children: EntityType.POLICY, realm: EntityType.REALM };

export const policySchema = defineSchema<Policy>({
    name: EntityType.POLICY,
    indexes: [
        ['id'],
        ['name', 'realmId'],
        ['displayName'],
        ['type'],
        ['parentId'],
        ['realmId'],
        ['builtIn'],
        ['createdAt'],
        ['updatedAt'],
    ],
    fields: {
        default: [
            'id',
            'builtIn',
            'type',
            'displayName',
            'name',
            'description',
            'invert',
            'parentId',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['id', 'name', 'displayName', 'type', 'parentId', 'realmId', 'builtIn'], indexed: true },
    relations: { allowed: ['children', 'realm'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
