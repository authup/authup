/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { AxiosInstance } from 'axios';
import { nullifyEmptyObjectProperties } from '../../utils';
import { Oauth2ProviderRole } from './entity';
import { CollectionResourceResponse, SingleResourceResponse } from '../type';

export class Oauth2ProviderRoleAPI {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async getMany(data: BuildInput<Oauth2ProviderRole>): Promise<CollectionResourceResponse<Oauth2ProviderRole>> {
        const response = await this.client.get(`provider-roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: typeof Oauth2ProviderRole.prototype.id): Promise<SingleResourceResponse<Oauth2ProviderRole>> {
        const response = await this.client.get(`provider-roles/${id}`);

        return response.data;
    }

    async delete(id: typeof Oauth2ProviderRole.prototype.id): Promise<SingleResourceResponse<Oauth2ProviderRole>> {
        const response = await this.client.delete(`provider-roles/${id}`);

        return response.data;
    }

    async create(data: Partial<Oauth2ProviderRole>): Promise<SingleResourceResponse<Oauth2ProviderRole>> {
        const response = await this.client.post('provider-roles', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: typeof Oauth2ProviderRole.prototype.id,
        data: Partial<Oauth2ProviderRole>,
    ): Promise<SingleResourceResponse<Oauth2ProviderRole>> {
        const response = await this.client.post(`provider-roles/${id}`, data);

        return response.data;
    }
}
