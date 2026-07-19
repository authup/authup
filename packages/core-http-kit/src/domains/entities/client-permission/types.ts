/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntityAPI } from '../../types-base';

import type { ClientPermission } from '@authup/core-kit';

// Mirrors `ClientPermissionValidator` mounts in @authup/core-kit.
export type ClientPermissionCreatePayload = Pick<ClientPermission, 'clientId' | 'permissionId'> &
    Partial<Pick<ClientPermission, 'policyId' | 'realmScope'>>;
export type ClientPermissionUpdatePayload = Partial<ClientPermissionCreatePayload>;

export interface IClientPermissionAPI extends IEntityAPI<ClientPermission, ClientPermissionCreatePayload, ClientPermissionUpdatePayload> {}
