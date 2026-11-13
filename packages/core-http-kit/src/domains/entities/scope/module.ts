/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Scope } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IScopeAPI,
    ScopeCreatePayload,
    ScopeSavePayload,
    ScopeUpdatePayload,
} from './types';
import { buildRequestConfig } from '../../utils';

export class ScopeAPI extends BaseAPI implements IScopeAPI {
    async getStats(query: EntityStatsQuery<Scope> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('scopes', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('scopes/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<Scope>, options?: APIRequestOptions): Promise<EntityCollectionResponse<Scope>> {
        const response = await this.client.get(`scopes${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: Scope['id'], record?: EntityQueryInput<Scope>, options?: APIRequestOptions): Promise<EntityRecordResponse<Scope>> {
        const response = await this.client.get(`scopes/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: Scope['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<Scope>> {
        const response = await this.client.delete(`scopes/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: ScopeCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Scope>> {
        const response = await this.client.post('scopes', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(id: Scope['id'], data: ScopeUpdatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Scope>> {
        const response = await this.client.post(`scopes/${id}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: ScopeSavePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<Scope>> {
        const response = await this.client.put(`scopes/${idOrName}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }
}
