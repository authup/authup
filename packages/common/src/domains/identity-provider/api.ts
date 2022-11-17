/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from 'rapiq';
import { ClientDriverInstance } from 'hapic';
import { IdentityProvider } from './entity';
import { nullifyEmptyObjectProperties, removeDuplicateForwardSlashesFromURL } from '../../utils';
import { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../type';
import { buildIdentityProviderAuthorizePath } from './utils';

export class IdentityProviderAPI implements DomainAPI<IdentityProvider> {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    getAuthorizeUri(baseUrl: string, id: IdentityProvider['id']): string {
        return removeDuplicateForwardSlashesFromURL(`${baseUrl}/${buildIdentityProviderAuthorizePath(id)}`);
    }

    async getMany(record?: BuildInput<IdentityProvider>): Promise<CollectionResourceResponse<IdentityProvider>> {
        const response = await this.client.get(`identity-providers${buildQuery(record)}`);

        return response.data;
    }

    async getOne(
        id: IdentityProvider['id'],
        record?: BuildInput<IdentityProvider>,
    ): Promise<SingleResourceResponse<IdentityProvider>> {
        const response = await this.client.get(`identity-providers/${id}${buildQuery(record)}`);

        return response.data;
    }

    async delete(id: IdentityProvider['id']): Promise<SingleResourceResponse<IdentityProvider>> {
        const response = await this.client.delete(`identity-providers/${id}`);

        return response.data;
    }

    async create(data: Partial<IdentityProvider>): Promise<SingleResourceResponse<IdentityProvider>> {
        const response = await this.client.post('identity-providers', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: IdentityProvider['id'], data: Partial<IdentityProvider>): Promise<SingleResourceResponse<IdentityProvider>> {
        const response = await this.client.post(`identity-providers/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
