/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { UserPermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const userPermissionSchema = defineSchema<UserPermission>({
    name: EntityType.USER_PERMISSION,
    filters: { allowed: ['userId', 'permissionId'] },
    relations: { allowed: ['user', 'permission'] },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping: { user: EntityType.USER, permission: EntityType.PERMISSION },
});
