/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { RoleAttribute } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const roleAttributeSchema = defineSchema<RoleAttribute>({
    name: EntityType.ROLE_ATTRIBUTE,
    filters: { allowed: ['id', 'name', 'roleId', 'realmId'] },
    sort: {
        allowed: [
            'id',
            'name',
            'roleId',
            'realmId',
            'createdAt',
            'updatedAt',
        ], 
    },
    pagination: { maxLimit: 50 },
});
