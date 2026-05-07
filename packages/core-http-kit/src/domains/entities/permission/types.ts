/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '@authup/core-kit';

export type PermissionAPICheckResponse = {
    status: 'success' | 'error',
    data?: Record<string, any>
};

// Mirrors `PermissionValidator` mounts in @authup/core-kit.
export type PermissionCreatePayload = Pick<Permission, 'name'> &
    Partial<Pick<Permission, 'display_name' | 'description' | 'client_id' | 'realm_id' | 'decision_strategy'>>;
export type PermissionUpdatePayload = Partial<PermissionCreatePayload>;
export type PermissionSavePayload = PermissionCreatePayload;
