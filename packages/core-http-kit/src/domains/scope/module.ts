/*
 * Copyright (c) 2021.
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
    DomainAPI, ResourceCollectionResponse, ResourceResponse,
} from '../types-base';

export class ScopeAPI extends BaseAPI implements DomainAPI<Scope> {
    async getMany(data?: BuildInput<Scope>): Promise<ResourceCollectionResponse<Scope>> {
        return this.client.get(`scopes${buildQuery(data)}`);
    }

    async getOne(id: Scope['id']): Promise<ResourceResponse<Scope>> {
        return this.client.get(`scopes/${id}`);
    }

    async delete(id: Scope['id']): Promise<ResourceResponse<Scope>> {
        return this.client.delete(`scopes/${id}`);
    }

    async create(data: Partial<Scope>): Promise<ResourceResponse<Scope>> {
        return this.client.post('scopes', nullifyEmptyObjectProperties(data));
    }

    async update(id: Scope['id'], data: Partial<Scope>): Promise<ResourceResponse<Scope>> {
        return this.client.post(`scopes/${id}`, nullifyEmptyObjectProperties(data));
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<Scope>,
    ): Promise<ResourceResponse<Scope>> {
        return this.client.put(`scopes/${idOrName}`, nullifyEmptyObjectProperties(data));
    }
}
