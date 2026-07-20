/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { Session } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { SESSION_FILTER_KEYS } from '../../authentication/session/types.ts';

export const sessionSchema = defineSchema<Session>({
    name: EntityType.SESSION,
    fields: {
        allowed: [
            'id',
            'sub',
            'subKind',
            'ipAddress',
            'userAgent',
            'expiresAt',
            'refreshedAt',
            'seenAt',
            'createdAt',
            'updatedAt',
            'userId',
            'clientId',
            'realmId',
        ],
    },
    filters: { allowed: [...SESSION_FILTER_KEYS] },
    relations: { allowed: ['realm'] },
    sort: { allowed: ['seenAt', 'expiresAt', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping: { realm: EntityType.REALM },
});
