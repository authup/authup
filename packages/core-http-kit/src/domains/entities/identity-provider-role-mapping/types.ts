/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntityAPI } from '../../types-base';

import type { IdentityProviderRoleMapping } from '@authup/core-kit';

// Mirrors `IdentityProviderRoleMappingValidator` mounts in @authup/core-kit.
export type IdentityProviderRoleMappingCreatePayload = Pick<IdentityProviderRoleMapping, 'providerId' | 'roleId'> &
    Partial<Pick<IdentityProviderRoleMapping, 'name' | 'value' | 'valueIsRegex' | 'synchronizationMode'>>;
export type IdentityProviderRoleMappingUpdatePayload = Partial<IdentityProviderRoleMappingCreatePayload>;

export interface IIdentityProviderRoleMappingAPI extends IEntityAPI<
    IdentityProviderRoleMapping,
    IdentityProviderRoleMappingCreatePayload,
    IdentityProviderRoleMappingUpdatePayload
> {}
