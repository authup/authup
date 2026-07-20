/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { TrustAnchor } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const trustAnchorSchema = defineSchema<TrustAnchor>({
    name: EntityType.TRUST_ANCHOR,
    fields: {
        allowed: [
            'id',
            'name',
            'certificate',
            'enabled',
            'realmId',
            'createdAt',
            'updatedAt',
        ],
    },
    filters: { allowed: ['id', 'name', 'enabled', 'realmId'] },
    sort: { allowed: ['id', 'name', 'enabled', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
});
