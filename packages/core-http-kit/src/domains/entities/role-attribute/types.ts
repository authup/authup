/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntityAPI } from '../../types-base';

import type { RoleAttribute } from '@authup/core-kit';

// `RoleAttribute` has no dedicated validator class — `RoleAttributeService` validates
// inline. `roleId` is required at runtime: the service sets
// `data.realmId = data.role.realmId` after `validateJoinColumns` populates `data.role`
// from the `roleId` FK, so omitting `roleId` causes a TypeError.
export type RoleAttributeCreatePayload = Pick<RoleAttribute, 'name' | 'roleId'> &
    Partial<Pick<RoleAttribute, 'value'>>;
export type RoleAttributeUpdatePayload = Partial<RoleAttributeCreatePayload>;
export type RoleAttributeSavePayload = RoleAttributeCreatePayload;

export interface IRoleAttributeAPI extends IEntityAPI<RoleAttribute, RoleAttributeCreatePayload, RoleAttributeUpdatePayload> {}
