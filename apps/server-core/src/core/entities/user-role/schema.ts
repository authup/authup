/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { UserRole } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { createRelationsReadGate } from '../../query/relations.ts';

const schemaMapping = { user: EntityType.USER, role: EntityType.ROLE };

export const userRoleSchema = defineSchema<UserRole>({
    name: EntityType.USER_ROLE,
    indexes: [
        ['id'],
        ['roleId', 'userId'],
        ['userId'],
        ['roleRealmId'],
        ['userRealmId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    // `default` pins an explicit root projection: an include= decodes the
    // relation's fields, and the adapter's select-replace would otherwise
    // drop every root column (incl. the id the DISTINCT wrapper needs).
    fields: {
        default: [
            'id',
            'roleId',
            'roleRealmId',
            'userId',
            'userRealmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['roleId', 'userId', 'createdAt', 'id', 'updatedAt', 'roleRealmId', 'userRealmId'], indexed: true },
    relations: { allowed: ['user', 'role'], validate: createRelationsReadGate(schemaMapping) },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
    schemaMapping,
});
