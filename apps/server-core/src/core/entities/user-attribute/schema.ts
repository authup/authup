/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { UserAttribute } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { user: EntityType.USER, realm: EntityType.REALM };

export const userAttributeSchema = defineSchema<UserAttribute>({
    name: EntityType.USER_ATTRIBUTE,
    indexes: [
        ['id'],
        ['name', 'userId'],
        ['userId'],
        ['realmId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    // see user-role schema — explicit root projection for include= decodes
    fields: {
        default: [
            'id',
            'name',
            'value',
            'userId',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['id', 'name', 'userId', 'realmId'], indexed: true },
    relations: { allowed: ['user', 'realm'], validate: createRelationsReadGate(schemaMapping) },
    sorts: {
        allowed: [
            'id',
            'name',
            'userId',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
        indexed: true,
    },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
