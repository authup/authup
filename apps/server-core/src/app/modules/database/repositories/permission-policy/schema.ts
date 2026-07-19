/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import type { PermissionPolicy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';

export const permissionPolicySchema = defineSchema<PermissionPolicy>({
    name: EntityType.PERMISSION_POLICY,
    filters: { allowed: ['permissionId', 'policyId'] },
    relations: { allowed: ['permission', 'policy'] },
    sort: { allowed: ['id', 'createdAt', 'updatedAt'] },
    pagination: { maxLimit: 50 },
    schemaMapping: { permission: EntityType.PERMISSION, policy: EntityType.POLICY },
});
