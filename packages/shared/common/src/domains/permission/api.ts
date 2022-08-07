/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from 'rapiq';
import { ClientDriverInstance } from 'hapic';
import { Permission } from './entity';
import { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../type';

export class PermissionAPI implements DomainAPI<Permission> {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    async getMany(data?: BuildInput<Permission>): Promise<CollectionResourceResponse<Permission>> {
        const response = await this.client.get(`permissions${buildQuery(data)}`);
        return response.data;
    }

    async delete(id: Permission['id']): Promise<SingleResourceResponse<Permission>> {
        const response = await this.client.delete(`permissions/${id}`);

        return response.data;
    }

    async getOne(id: Permission['id'], record?: BuildInput<Permission>) {
        const response = await this.client.get(`permissions/${id}`);

        return response.data;
    }

    async create(data: Pick<Permission, 'id'>): Promise<SingleResourceResponse<Permission>> {
        const response = await this.client.post('permissions', data);

        return response.data;
    }

    async update(id: Permission['id'], data: Pick<Permission, 'id'>): Promise<SingleResourceResponse<Permission>> {
        const response = await this.client.post(`permissions/${id}`, data);

        return response.data;
    }
}
