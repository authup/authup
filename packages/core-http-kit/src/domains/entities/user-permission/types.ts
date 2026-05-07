/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserPermission } from '@authup/core-kit';

// Mirrors `UserPermissionValidator` mounts in @authup/core-kit.
export type UserPermissionCreatePayload = Pick<UserPermission, 'user_id' | 'permission_id'> &
    Partial<Pick<UserPermission, 'policy_id'>>;
export type UserPermissionUpdatePayload = Partial<UserPermissionCreatePayload>;
