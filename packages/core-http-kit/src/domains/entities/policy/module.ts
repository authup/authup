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
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
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

export class PolicyAPI extends BaseAPI implements IPolicyAPI {
    async getMany<
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(data?: EntityQueryInput<Policy & { parentId?: string | null }>): Promise<EntityCollectionResponse<OUTPUT>> {
        const response = await this.client.get(`policies${buildQueryString(data)}`);
        return response.data;
    }

    async delete<
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(id: Policy['id']): Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.delete(`policies/${id}`);

        return response.data;
    }

    async getOne<
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(id: Policy['id'], record?: EntityQueryInput<Policy>) : Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.get(`policies/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async getOneExpanded<
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(id: Policy['id'], record?: EntityQueryInput<Policy>) : Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.get(`policies/${id}/expanded${buildQueryString(record)}`);

        return response.data;
    }

    async create<
        INPUT extends PolicyCreatePayload = PolicyCreatePayload,
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(data: INPUT): Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.post('policies', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createBuiltIn(
        data: BuiltInPolicyCreatePayload,
    ): Promise<EntityRecordResponse<BuiltInPolicyResponse>> {
        return this.create(data);
    }

    async update<
        INPUT extends PolicyUpdatePayload = PolicyUpdatePayload,
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(id: Policy['id'], data: INPUT): Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.post(`policies/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async updateBuiltIn(
        id: Policy['id'],
        data: BuiltInPolicyUpdatePayload,
    ): Promise<EntityRecordResponse<BuiltInPolicyResponse>> {
        return this.update(id, data);
    }

    async createOrUpdate<
        INPUT extends PolicyCreatePayload = PolicyCreatePayload,
        OUTPUT extends PolicyResponse = PolicyResponse,
    >(
        idOrName: string,
        data: INPUT,
    ): Promise<EntityRecordResponse<OUTPUT>> {
        const response = await this.client.put(`policies/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdateBuiltin(
        idOrName: string,
        data: BuiltInPolicyCreatePayload,
    ): Promise<EntityRecordResponse<BuiltInPolicyResponse>> {
        return this.createOrUpdate(idOrName, data);
    }

    async check(
        idOrName: string,
        data: Record<string, any> = {},
    ) : Promise<PolicyAPICheckResponse> {
        const response = await this.client.post(
            `policies/${idOrName}/check`,
            nullifyEmptyObjectProperties(data),
        );

        return response.data;
    }
}
