/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Scope } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type {
    CollectionResourceResponse, DomainAPI, SingleResourceResponse,
} from '../types-base';

export class ScopeAPI extends BaseAPI implements DomainAPI<Scope> {
    async getMany(data?: BuildInput<Scope>): Promise<CollectionResourceResponse<Scope>> {
        const response = await this.client.get(`scopes${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: Scope['id']): Promise<SingleResourceResponse<Scope>> {
        const response = await this.client.get(`scopes/${id}`);

        return response.data;
    }

    async delete(id: Scope['id']): Promise<SingleResourceResponse<Scope>> {
        const response = await this.client.delete(`scopes/${id}`);

        return response.data;
    }

    async create(data: Partial<Scope>): Promise<SingleResourceResponse<Scope>> {
        const response = await this.client.post('scopes', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Scope['id'], data: Partial<Scope>): Promise<SingleResourceResponse<Scope>> {
        const response = await this.client.post(`scopes/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<Scope>,
    ): Promise<SingleResourceResponse<Scope>> {
        const response = await this.client.put(`scopes/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
