/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { User } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const userSchema = defineSchema<User>({
    name: EntityType.USER,
    fields: {
        default: [
            'id',
            'name',
            'nameLocked',
            'firstName',
            'lastName',
            'displayName',
            'avatar',
            'cover',
            'active',
            'createdAt',
            'updatedAt',
            'realmId',
        ],
        allowed: ['email'],
    },
    filters: { allowed: ['id', 'name', 'realmId'] },
    relations: { allowed: ['realm'] },
    sort: { allowed: ['id', 'name', 'displayName', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping: { realm: EntityType.REALM },
});
