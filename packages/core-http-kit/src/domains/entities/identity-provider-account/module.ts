/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers/index.ts';
import { buildQueryString, encodePathSegment } from '../../../helpers/index.ts';
import type { IdentityProviderAccount } from '@authup/core-kit';
import { BaseAPI } from '../../base.ts';
import type { EntitySchemaResponse } from '../../stats/index.ts';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base.ts';
import type { IIdentityProviderAccountAPI } from './types.ts';
import { buildRequestConfig } from '../../utils.ts';

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
        const response = await this.client.get(`identity-provider-accounts/${encodePathSegment(id)}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: IdentityProviderAccount['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<IdentityProviderAccount>> {
        const response = await this.client.delete(`identity-provider-accounts/${encodePathSegment(id)}`, buildRequestConfig(options));

        return response.data;
    }
}
