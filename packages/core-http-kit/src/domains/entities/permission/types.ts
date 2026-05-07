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

export type PermissionCreatePayload = Partial<Permission>;
export type PermissionUpdatePayload = Partial<Permission>;
export type PermissionSavePayload = Partial<Permission>;
