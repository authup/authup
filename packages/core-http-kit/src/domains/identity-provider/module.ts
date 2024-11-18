/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { IdentityProvider } from '@authup/core-kit';
import { buildIdentityProviderAuthorizePath } from '@authup/core-kit';
import { cleanDoubleSlashes, nullifyEmptyObjectProperties } from '../../utils';
import type { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../types-base';
import { BaseAPI } from '../base';

export class IdentityProviderAPI extends BaseAPI implements DomainAPI<IdentityProvider> {
    getAuthorizeUri(baseUrl: string, id: IdentityProvider['id']): string {
        return cleanDoubleSlashes(`${baseUrl}/${buildIdentityProviderAuthorizePath(id)}`);
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

    async createOrUpdate(
        idOrName: string,
        data: Partial<IdentityProvider>,
    ): Promise<SingleResourceResponse<IdentityProvider>> {
        const response = await this.client.put(`identity-providers/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
