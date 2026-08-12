/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Realm } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const realmSchema = defineSchema<Realm>({
    name: EntityType.REALM,
    indexes: [
        ['id'],
        ['name'],
        ['builtIn'],
        ['displayName'],
        ['createdAt'],
        ['updatedAt'],
    ],
    fields: {
        allowed: [
            'id',
            'name',
            'displayName',
            'description',
            'builtIn',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['id', 'builtIn', 'displayName', 'name'], indexed: true },
    relations: { allowed: [] },
    sort: { allowed: ['id', 'name', 'createdAt', 'updatedAt'], indexed: true },
    pagination: { maxLimit: 50 },
});
