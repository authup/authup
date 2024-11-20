/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../../types-base';

export class IdentityProviderRoleMappingAPI extends BaseAPI implements DomainAPI<IdentityProviderRoleMapping> {
    async getMany(data: BuildInput<IdentityProviderRoleMapping>): Promise<CollectionResourceResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.get(`identity-provider-role-mappings${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: IdentityProviderRoleMapping['id']): Promise<SingleResourceResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.get(`identity-provider-role-mappings/${id}`);

        return response.data;
    }

    async delete(id: IdentityProviderRoleMapping['id']): Promise<SingleResourceResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.delete(`identity-provider-role-mappings/${id}`);

        return response.data;
    }

    async create(data: Partial<IdentityProviderRoleMapping>): Promise<SingleResourceResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.post('identity-provider-role-mappings', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: IdentityProviderRoleMapping['id'],
        data: Partial<IdentityProviderRoleMapping>,
    ): Promise<SingleResourceResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.post(`identity-provider-role-mappings/${id}`, data);

        return response.data;
    }
}
