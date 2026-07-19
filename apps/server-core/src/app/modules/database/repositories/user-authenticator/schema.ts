/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { UserAuthenticator } from '@authup/core-kit';

export const userAuthenticatorSchema = defineSchema<UserAuthenticator>({
    name: 'userAuthenticator',
    fields: {
        allowed: [
            'id',
            'kind',
            'name',
            'confirmed',
            'lastUsedAt',
            'createdAt',
            'updatedAt',
            'userId',
            'realmId',
        ],
    },
    filters: { allowed: ['id', 'kind', 'confirmed', 'userId', 'realmId'] },
    sort: { allowed: ['createdAt', 'updatedAt', 'lastUsedAt'] },
    pagination: { maxLimit: 50 },
});
