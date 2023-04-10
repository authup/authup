/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Driver } from 'hapic';
import { nullifyEmptyObjectProperties } from '../../utils';
import type { Scope } from './types';
import type {
    CollectionResourceResponse, DomainAPI, SingleResourceResponse,
} from '../types-base';

export class ScopeAPI implements DomainAPI<Scope> {
    protected driver: Driver;

    constructor(client: Driver) {
        this.driver = client;
    }

    async getMany(data?: BuildInput<Scope>): Promise<CollectionResourceResponse<Scope>> {
        const response = await this.driver.get(`scopes${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: Scope['id']): Promise<SingleResourceResponse<Scope>> {
        const response = await this.driver.get(`scopes/${id}`);

        return response.data;
    }

    async delete(id: Scope['id']): Promise<SingleResourceResponse<Scope>> {
        const response = await this.driver.delete(`scopes/${id}`);

        return response.data;
    }

    async create(data: Partial<Scope>): Promise<SingleResourceResponse<Scope>> {
        const response = await this.driver.post('scopes', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Scope['id'], data: Partial<Scope>): Promise<SingleResourceResponse<Scope>> {
        const response = await this.driver.post(`scopes/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
