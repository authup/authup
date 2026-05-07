/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RolePermission } from '@authup/core-kit';

// Mirrors `RolePermissionValidator` mounts in @authup/core-kit.
export type RolePermissionCreatePayload = Pick<RolePermission, 'role_id' | 'permission_id'> &
    Partial<Pick<RolePermission, 'policy_id'>>;
export type RolePermissionUpdatePayload = Partial<RolePermissionCreatePayload>;
