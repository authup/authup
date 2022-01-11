/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { AxiosInstance } from 'axios';
import { OAuth2Provider } from './entity';
import { nullifyEmptyObjectProperties } from '../../utils';
import { CollectionResourceResponse, SingleResourceResponse } from '../type';

export class Oauth2ProviderAPI {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    getAuthorizeUri(baseUrl: string, id: OAuth2Provider['id']): string {
        return `${baseUrl}providers/${id}/authorize-url`;
    }

    async getMany(record?: BuildInput<OAuth2Provider>): Promise<CollectionResourceResponse<OAuth2Provider>> {
        const response = await this.client.get(`providers${buildQuery(record)}`);

        return response.data;
    }

    async getOne(
        id: OAuth2Provider['id'],
        record?: BuildInput<OAuth2Provider>,
    ): Promise<SingleResourceResponse<OAuth2Provider>> {
        const response = await this.client.get(`providers/${id}${buildQuery(record)}`);

        return response.data;
    }

    async delete(id: OAuth2Provider['id']): Promise<SingleResourceResponse<OAuth2Provider>> {
        const response = await this.client.delete(`providers/${id}`);

        return response.data;
    }

    async create(data: Partial<OAuth2Provider>): Promise<SingleResourceResponse<OAuth2Provider>> {
        const response = await this.client.post('providers', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: OAuth2Provider['id'], data: Partial<OAuth2Provider>): Promise<SingleResourceResponse<OAuth2Provider>> {
        const response = await this.client.post(`providers/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
