/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { IdentityProviderAccount } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntitySchemaResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { IIdentityProviderAccountAPI } from './types';
import { buildRequestConfig } from '../../utils';

export class IdentityProviderAccountAPI extends BaseAPI implements IIdentityProviderAccountAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('identity-provider-accounts/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(
        data?: EntityQueryInput<IdentityProviderAccount>,
        options?: APIRequestOptions,
    ): Promise<EntityCollectionResponse<IdentityProviderAccount>> {
        const response = await this.client.get(`identity-provider-accounts${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(
        id: IdentityProviderAccount['id'],
        record?: EntityQueryInput<IdentityProviderAccount>,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<IdentityProviderAccount>> {
        const response = await this.client.get(`identity-provider-accounts/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: IdentityProviderAccount['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<IdentityProviderAccount>> {
        const response = await this.client.delete(`identity-provider-accounts/${id}`, buildRequestConfig(options));

        return response.data;
    }
}
