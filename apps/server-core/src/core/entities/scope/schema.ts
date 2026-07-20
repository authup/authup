/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Scope } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const scopeSchema = defineSchema<Scope>({
    name: EntityType.SCOPE,
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
    filters: { allowed: ['id', 'builtIn', 'name', 'realmId'] },
    sort: { allowed: ['id', 'name', 'updatedAt', 'createdAt'] },
    pagination: { maxLimit: 50 },
});
