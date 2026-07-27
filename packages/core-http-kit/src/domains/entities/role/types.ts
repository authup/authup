/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityRecordWrappedResponse, IEntityAPI } from '../../types-base';

import type { Role } from '@authup/core-kit';

// Mirrors `RoleValidator` mounts in @authup/core-kit.
export type RoleCreatePayload = Pick<Role, 'name'> &
    Partial<Pick<Role, 'displayName' | 'description' | 'clientId' | 'realmId'>>;
export type RoleUpdatePayload = Partial<RoleCreatePayload>;
export type RoleSavePayload = RoleCreatePayload;

export interface IRoleAPI extends IEntityAPI<Role, RoleCreatePayload, RoleUpdatePayload> {
    createOrUpdate(idOrName: string, data: RoleSavePayload) : Promise<EntityRecordWrappedResponse<Role>>;
}
