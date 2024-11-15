/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { ExtendedPolicy, Policy } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type { DomainAPI, ResourceCollectionResponse, ResourceResponse } from '../types-base';
import type { PolicyAPICheckResponse } from './types';

export class PolicyAPI extends BaseAPI implements DomainAPI<Policy> {
    async getMany(data?: BuildInput<Policy>): Promise<ResourceCollectionResponse<ExtendedPolicy>> {
        return this.client.get(`policies${buildQuery(data)}`);
    }

    async delete(id: Policy['id']): Promise<ResourceResponse<ExtendedPolicy>> {
        return this.client.delete(`policies/${id}`);
    }

    async getOne(id: Policy['id'], record?: BuildInput<Policy>) : Promise<ResourceResponse<ExtendedPolicy>> {
        return this.client.get(`policies/${id}${buildQuery(record)}`);
    }

    async create(data: Partial<ExtendedPolicy>): Promise<ResourceResponse<ExtendedPolicy>> {
        return this.client.post('policies', nullifyEmptyObjectProperties(data));
    }

    async update(id: Policy['id'], data: Partial<ExtendedPolicy>): Promise<ResourceResponse<ExtendedPolicy>> {
        return this.client.post(`policies/${id}`, nullifyEmptyObjectProperties(data));
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<ExtendedPolicy>,
    ): Promise<ResourceResponse<ExtendedPolicy>> {
        return this.client.put(`policies/${idOrName}`, nullifyEmptyObjectProperties(data));
    }

    async check(
        idOrName: string,
        data: Record<string, any>,
    ) : Promise<PolicyAPICheckResponse> {
        return this.client.put(
            `policies/${idOrName}/check`,
            nullifyEmptyObjectProperties(data),
        );
    }
}
