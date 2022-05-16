/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { ClientDriverInstance } from '@trapi/client';
import { OAuth2Provider } from './entity';
import { nullifyEmptyObjectProperties, removeDuplicateForwardSlashesFromURL } from '../../utils';
import { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../type';
import { buildOAuth2ProviderAuthorizePath } from './utils';

export class OAuth2ProviderAPI implements DomainAPI<OAuth2Provider> {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    getAuthorizeUri(baseUrl: string, id: OAuth2Provider['id']): string {
        return removeDuplicateForwardSlashesFromURL(`${baseUrl}/${buildOAuth2ProviderAuthorizePath(id)}`);
    }

    async getMany(record?: BuildInput<OAuth2Provider>): Promise<CollectionResourceResponse<OAuth2Provider>> {
        const response = await this.client.get(`oauth2-providers${buildQuery(record)}`);

        return response.data;
    }

    async getOne(
        id: OAuth2Provider['id'],
        record?: BuildInput<OAuth2Provider>,
    ): Promise<SingleResourceResponse<OAuth2Provider>> {
        const response = await this.client.get(`oauth2-providers/${id}${buildQuery(record)}`);

        return response.data;
    }

    async delete(id: OAuth2Provider['id']): Promise<SingleResourceResponse<OAuth2Provider>> {
        const response = await this.client.delete(`oauth2-providers/${id}`);

        return response.data;
    }

    async create(data: Partial<OAuth2Provider>): Promise<SingleResourceResponse<OAuth2Provider>> {
        const response = await this.client.post('oauth2-providers', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: OAuth2Provider['id'], data: Partial<OAuth2Provider>): Promise<SingleResourceResponse<OAuth2Provider>> {
        const response = await this.client.post(`oauth2-providers/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
