/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { ExtendedPolicy, Policy } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../../types-base';
import type { PolicyAPICheckResponse } from './types';

export class PolicyAPI extends BaseAPI implements DomainAPI<Policy> {
    async getMany(data?: BuildInput<Policy>): Promise<CollectionResourceResponse<ExtendedPolicy>> {
        const response = await this.client.get(`policies${buildQuery(data)}`);
        return response.data;
    }

    async delete(id: Policy['id']): Promise<SingleResourceResponse<ExtendedPolicy>> {
        const response = await this.client.delete(`policies/${id}`);

        return response.data;
    }

    async getOne(id: Policy['id'], record?: BuildInput<Policy>) : Promise<SingleResourceResponse<ExtendedPolicy>> {
        const response = await this.client.get(`policies/${id}${buildQuery(record)}`);

        return response.data;
    }

    async create(data: Partial<ExtendedPolicy>): Promise<SingleResourceResponse<ExtendedPolicy>> {
        const response = await this.client.post('policies', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Policy['id'], data: Partial<ExtendedPolicy>): Promise<SingleResourceResponse<ExtendedPolicy>> {
        const response = await this.client.post(`policies/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<ExtendedPolicy>,
    ): Promise<SingleResourceResponse<ExtendedPolicy>> {
        const response = await this.client.put(`policies/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
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
