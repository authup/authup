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
    filters: { allowed: ['id', 'builtIn', 'displayName', 'name'] },
    sort: { allowed: ['id', 'name', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
});
