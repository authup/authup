/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from 'rapiq';
import { ClientDriverInstance } from 'hapic';
import { nullifyEmptyObjectProperties } from '../../utils';
import { IdentityProviderRole } from './entity';
import { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../type';

export class IdentityProviderRoleAPI implements DomainAPI<IdentityProviderRole> {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    async getMany(data: BuildInput<IdentityProviderRole>): Promise<CollectionResourceResponse<IdentityProviderRole>> {
        const response = await this.client.get(`identity-provider-roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: IdentityProviderRole['id']): Promise<SingleResourceResponse<IdentityProviderRole>> {
        const response = await this.client.get(`identity-provider-roles/${id}`);

        return response.data;
    }

    async delete(id: IdentityProviderRole['id']): Promise<SingleResourceResponse<IdentityProviderRole>> {
        const response = await this.client.delete(`identity-provider-roles/${id}`);

        return response.data;
    }

    async create(data: Partial<IdentityProviderRole>): Promise<SingleResourceResponse<IdentityProviderRole>> {
        const response = await this.client.post('identity-provider-roles', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: IdentityProviderRole['id'],
        data: Partial<IdentityProviderRole>,
    ): Promise<SingleResourceResponse<IdentityProviderRole>> {
        const response = await this.client.post(`identity-provider-roles/${id}`, data);

        return response.data;
    }
}
