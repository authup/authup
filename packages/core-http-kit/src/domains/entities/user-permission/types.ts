/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserPermission } from '@authup/core-kit';

export type UserPermissionCreateInput = Partial<UserPermission>;
export type UserPermissionUpdateInput = Partial<UserPermission>;
export type UserPermissionResponse = UserPermission;
