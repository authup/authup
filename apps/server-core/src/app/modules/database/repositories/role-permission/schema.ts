/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { RolePermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const rolePermissionSchema = defineSchema<RolePermission>({
    name: EntityType.ROLE_PERMISSION,
    filters: { allowed: ['roleId', 'permissionId'] },
    relations: { allowed: ['role', 'permission'] },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping: { role: EntityType.ROLE, permission: EntityType.PERMISSION },
});
