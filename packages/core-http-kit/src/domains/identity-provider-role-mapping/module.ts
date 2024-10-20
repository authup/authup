/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type { DomainAPI, ResourceCollectionResponse, ResourceResponse } from '../types-base';

export class IdentityProviderRoleMappingAPI extends BaseAPI implements DomainAPI<IdentityProviderRoleMapping> {
    async getMany(data: BuildInput<IdentityProviderRoleMapping>): Promise<ResourceCollectionResponse<IdentityProviderRoleMapping>> {
        return this.client.get(`identity-provider-role-mappings${buildQuery(data)}`);
    }

    async getOne(id: IdentityProviderRoleMapping['id']): Promise<ResourceResponse<IdentityProviderRoleMapping>> {
        return this.client.get(`identity-provider-role-mappings/${id}`);
    }

    async delete(id: IdentityProviderRoleMapping['id']): Promise<ResourceResponse<IdentityProviderRoleMapping>> {
        return this.client.delete(`identity-provider-role-mappings/${id}`);
    }

    async create(data: Partial<IdentityProviderRoleMapping>): Promise<ResourceResponse<IdentityProviderRoleMapping>> {
        return this.client.post('identity-provider-role-mappings', nullifyEmptyObjectProperties(data));
    }

    async update(
        id: IdentityProviderRoleMapping['id'],
        data: Partial<IdentityProviderRoleMapping>,
    ): Promise<ResourceResponse<IdentityProviderRoleMapping>> {
        return this.client.post(`identity-provider-role-mappings/${id}`, data);
    }
}
