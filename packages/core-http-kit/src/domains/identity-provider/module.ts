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
import type { DomainAPI, ResourceCollectionResponse, ResourceResponse } from '../types-base';
import { BaseAPI } from '../base';

export class IdentityProviderAPI extends BaseAPI implements DomainAPI<IdentityProvider> {
    getAuthorizeUri(baseUrl: string, id: IdentityProvider['id']): string {
        return cleanDoubleSlashes(`${baseUrl}/${buildIdentityProviderAuthorizePath(id)}`);
    }

    async getMany(record?: BuildInput<IdentityProvider>): Promise<ResourceCollectionResponse<IdentityProvider>> {
        return this.client.get(`identity-providers${buildQuery(record)}`);
    }

    async getOne(
        id: IdentityProvider['id'],
        record?: BuildInput<IdentityProvider>,
    ): Promise<ResourceResponse<IdentityProvider>> {
        return this.client.get(`identity-providers/${id}${buildQuery(record)}`);
    }

    async delete(id: IdentityProvider['id']): Promise<ResourceResponse<IdentityProvider>> {
        return this.client.delete(`identity-providers/${id}`);
    }

    async create(data: Partial<IdentityProvider>): Promise<ResourceResponse<IdentityProvider>> {
        return this.client.post('identity-providers', nullifyEmptyObjectProperties(data));
    }

    async update(id: IdentityProvider['id'], data: Partial<IdentityProvider>): Promise<ResourceResponse<IdentityProvider>> {
        return this.client.post(`identity-providers/${id}`, nullifyEmptyObjectProperties(data));
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<IdentityProvider>,
    ): Promise<ResourceResponse<IdentityProvider>> {
        return this.client.put(`identity-providers/${idOrName}`, nullifyEmptyObjectProperties(data));
    }
}
