/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { UserAttribute } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const userAttributeSchema = defineSchema<UserAttribute>({
    name: EntityType.USER_ATTRIBUTE,
    filters: { allowed: ['id', 'name', 'userId', 'realmId'] },
    sort: {
        allowed: [
            'id',
            'name',
            'userId',
            'realmId',
            'createdAt',
            'updatedAt',
        ], 
    },
    pagination: { maxLimit: 50 },
});
