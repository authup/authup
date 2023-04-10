/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Driver } from 'hapic';
import type { IdentityProvider } from './types';
import { nullifyEmptyObjectProperties, removeDuplicateForwardSlashesFromURL } from '../../utils';
import type { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../types-base';
import { buildIdentityProviderAuthorizePath } from './utils';

export class IdentityProviderAPI implements DomainAPI<IdentityProvider> {
    protected driver: Driver;

    constructor(client: Driver) {
        this.driver = client;
    }

    getAuthorizeUri(baseUrl: string, id: IdentityProvider['id']): string {
        return removeDuplicateForwardSlashesFromURL(`${baseUrl}/${buildIdentityProviderAuthorizePath(id)}`);
    }

    async getMany(record?: BuildInput<IdentityProvider>): Promise<CollectionResourceResponse<IdentityProvider>> {
        const response = await this.driver.get(`identity-providers${buildQuery(record)}`);

        return response.data;
    }

    async getOne(
        id: IdentityProvider['id'],
        record?: BuildInput<IdentityProvider>,
    ): Promise<SingleResourceResponse<IdentityProvider>> {
        const response = await this.driver.get(`identity-providers/${id}${buildQuery(record)}`);

        return response.data;
    }

    async delete(id: IdentityProvider['id']): Promise<SingleResourceResponse<IdentityProvider>> {
        const response = await this.driver.delete(`identity-providers/${id}`);

        return response.data;
    }

    async create(data: Partial<IdentityProvider>): Promise<SingleResourceResponse<IdentityProvider>> {
        const response = await this.driver.post('identity-providers', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: IdentityProvider['id'], data: Partial<IdentityProvider>): Promise<SingleResourceResponse<IdentityProvider>> {
        const response = await this.driver.post(`identity-providers/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
