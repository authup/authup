/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { ClientDriverInstance } from '@trapi/client';
import { nullifyEmptyObjectProperties } from '../../utils';
import { OAuth2ProviderRole } from './entity';
import { CollectionResourceResponse, SingleResourceResponse } from '../type';

export class OAuth2ProviderRoleAPI {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    async getMany(data: BuildInput<OAuth2ProviderRole>): Promise<CollectionResourceResponse<OAuth2ProviderRole>> {
        const response = await this.client.get(`oauth2-provider-roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: OAuth2ProviderRole['id']): Promise<SingleResourceResponse<OAuth2ProviderRole>> {
        const response = await this.client.get(`oauth2-provider-roles/${id}`);

        return response.data;
    }

    async delete(id: OAuth2ProviderRole['id']): Promise<SingleResourceResponse<OAuth2ProviderRole>> {
        const response = await this.client.delete(`oauth2-provider-roles/${id}`);

        return response.data;
    }

    async create(data: Partial<OAuth2ProviderRole>): Promise<SingleResourceResponse<OAuth2ProviderRole>> {
        const response = await this.client.post('oauth2-provider-roles', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: OAuth2ProviderRole['id'],
        data: Partial<OAuth2ProviderRole>,
    ): Promise<SingleResourceResponse<OAuth2ProviderRole>> {
        const response = await this.client.post(`oauth2-provider-roles/${id}`, data);

        return response.data;
    }
}
