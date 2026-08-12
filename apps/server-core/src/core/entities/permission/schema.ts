/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Permission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const permissionSchema = defineSchema<Permission>({
    name: EntityType.PERMISSION,
    indexes: [
        ['id'],
        ['name', 'clientId', 'realmId'],
        ['displayName'],
        ['builtIn'],
        ['realmId'],
        ['clientId'],
        ['createdAt'],
        ['updatedAt'],
    ],
    // explicit root projection so an include=permission decodes columns
    // (a schema without fields selects all as a query root but nothing as
    // an include child — see client-permission/user-role schema comments)
    fields: {
        allowed: [
            'id',
            'builtIn',
            'name',
            'displayName',
            'description',
            'decisionStrategy',
            'clientId',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['id', 'displayName', 'name', 'builtIn', 'realmId', 'createdAt', 'updatedAt', 'clientId'], indexed: true },
    relations: { allowed: [] },
    sort: { allowed: ['id', 'name', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
});
