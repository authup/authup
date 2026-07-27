/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityRecordWrappedResponse, IEntityAPI } from '../../types-base';

import type { Permission } from '@authup/core-kit';

export type PermissionAPICheckResponse = {
    status: 'success' | 'error',
    data?: Record<string, any>
};

// Mirrors `PermissionValidator` mounts in @authup/core-kit.
export type PermissionCreatePayload = Pick<Permission, 'name'> &
    Partial<Pick<Permission, 'displayName' | 'description' | 'clientId' | 'realmId' | 'decisionStrategy'>>;
export type PermissionUpdatePayload = Partial<PermissionCreatePayload>;
export type PermissionSavePayload = PermissionCreatePayload;

export interface IPermissionAPI extends IEntityAPI<Permission, PermissionCreatePayload, PermissionUpdatePayload> {
    createOrUpdate(idOrName: string, data: PermissionSavePayload) : Promise<EntityRecordWrappedResponse<Permission>>;
    check(idOrName: string, data?: Record<string, any>) : Promise<PermissionAPICheckResponse>;
}
