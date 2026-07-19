/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntityAPI } from '../../types-base';

import type { UserPermission } from '@authup/core-kit';

// Mirrors `UserPermissionValidator` mounts in @authup/core-kit.
export type UserPermissionCreatePayload = Pick<UserPermission, 'userId' | 'permissionId'> &
    Partial<Pick<UserPermission, 'policyId' | 'realmScope'>>;
export type UserPermissionUpdatePayload = Partial<UserPermissionCreatePayload>;

export interface IUserPermissionAPI extends IEntityAPI<UserPermission, UserPermissionCreatePayload, UserPermissionUpdatePayload> {}
