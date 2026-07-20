/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { UserRole } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const userRoleSchema = defineSchema<UserRole>({
    name: EntityType.USER_ROLE,
    filters: { allowed: ['roleId', 'userId'] },
    // @ts-expect-error User's EA index signature drops the relation key (tada5hi/rapiq#789)
    relations: { allowed: ['user', 'role'] },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping: { user: EntityType.USER, role: EntityType.ROLE },
});
