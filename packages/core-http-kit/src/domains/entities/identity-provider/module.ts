/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { IdentityProvider } from '@authup/core-kit';
import { buildIdentityProviderAuthorizePath } from '@authup/core-kit';
import { cleanDoubleSlashes, nullifyEmptyObjectProperties } from '../../../utils';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import { BaseAPI } from '../../base';
import type {
    IIdentityProviderAPI,
    IdentityProviderCreatePayload,
    IdentityProviderSavePayload,
    IdentityProviderUpdatePayload,
} from './types';

export class IdentityProviderAPI extends BaseAPI implements IIdentityProviderAPI {
    getAuthorizeUri(id: IdentityProvider['id']): string {
        return cleanDoubleSlashes(`${this.client.getBaseURL()}/${buildIdentityProviderAuthorizePath(id)}`);
    }

    async getMany(record?: EntityQueryInput<IdentityProvider>): Promise<EntityCollectionResponse<IdentityProvider>> {
        const response = await this.client.get(`identity-providers${buildQueryString(record)}`);

        return response.data;
    }

    async getOne(
        id: IdentityProvider['id'],
        record?: EntityQueryInput<IdentityProvider>,
    ): Promise<EntityRecordResponse<IdentityProvider>> {
        const response = await this.client.get(`identity-providers/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: IdentityProvider['id']): Promise<EntityRecordResponse<IdentityProvider>> {
        const response = await this.client.delete(`identity-providers/${id}`);

        return response.data;
    }

    async create(data: IdentityProviderCreatePayload): Promise<EntityRecordResponse<IdentityProvider>> {
        const response = await this.client.post('identity-providers', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: IdentityProvider['id'], data: IdentityProviderUpdatePayload): Promise<EntityRecordResponse<IdentityProvider>> {
        const response = await this.client.post(`identity-providers/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: IdentityProviderSavePayload,
    ): Promise<EntityRecordResponse<IdentityProvider>> {
        const response = await this.client.put(`identity-providers/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
