/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Policy } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    BuiltInPolicyCreatePayload,
    BuiltInPolicyResponse,
    BuiltInPolicyUpdatePayload,
    IPolicyAPI,
    PolicyAPICheckResponse,
    PolicyCreatePayload,
    PolicyResponse,
    PolicyUpdatePayload,
} from './types';
import { buildRequestConfig } from '../../utils';

export class PolicyAPI extends BaseAPI implements IPolicyAPI {
    async getStats(query: EntityStatsQuery<Policy> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('policies', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('policies/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany<
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(data?: EntityQueryInput<Policy & { parentId?: string | null }>, options?: APIRequestOptions): Promise<EntityCollectionResponse<OUTPUT>> {
        const response = await this.client.get(`policies${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete<
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(id: Policy['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.delete(`policies/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne<
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(id: Policy['id'], record?: EntityQueryInput<Policy>, options?: APIRequestOptions) : Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.get(`policies/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOneExpanded<
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(id: Policy['id'], record?: EntityQueryInput<Policy>, options?: APIRequestOptions) : Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.get(`policies/${id}/expanded${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async create<
        INPUT extends PolicyCreatePayload = PolicyCreatePayload,
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(data: INPUT, options?: APIRequestOptions): Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.post('policies', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async createBuiltIn(
        data: BuiltInPolicyCreatePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<BuiltInPolicyResponse>> {
        return this.create(data, options);
    }

    async update<
        INPUT extends PolicyUpdatePayload = PolicyUpdatePayload,
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(id: Policy['id'], data: INPUT, options?: APIRequestOptions): Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.post(`policies/${id}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async updateBuiltIn(
        id: Policy['id'],
        data: BuiltInPolicyUpdatePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<BuiltInPolicyResponse>> {
        return this.update(id, data, options);
    }

    async createOrUpdate<
        INPUT extends PolicyCreatePayload = PolicyCreatePayload,
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(
        idOrName: string,
        data: INPUT,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.put(`policies/${idOrName}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async createOrUpdateBuiltin(
        idOrName: string,
        data: BuiltInPolicyCreatePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<BuiltInPolicyResponse>> {
        return this.createOrUpdate(idOrName, data, options);
    }

    async check(
        idOrName: string,
        data: Record<string, any> = {},
        options?: APIRequestOptions,
    ) : Promise<PolicyAPICheckResponse> {
        const response = await this.client.post(
            `policies/${idOrName}/check`,
            nullifyEmptyObjectProperties(data),
            buildRequestConfig(options),
        );

        return response.data;
    }
}
