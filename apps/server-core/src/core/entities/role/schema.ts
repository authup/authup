/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Role } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const roleSchema = defineSchema<Role>({
    name: EntityType.ROLE,
    fields: {
        allowed: [
            'id',
            'name',
            'displayName',
            'target',
            'description',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['id', 'name', 'target', 'realmId'] },
    sort: { allowed: ['id', 'name', 'updatedAt', 'createdAt'] },
    pagination: { maxLimit: 50 },
});
