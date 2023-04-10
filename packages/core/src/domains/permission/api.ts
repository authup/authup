/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Driver } from 'hapic';
import type { Permission } from './types';
import type { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../types-base';

export class PermissionAPI implements DomainAPI<Permission> {
    protected driver: Driver;

    constructor(client: Driver) {
        this.driver = client;
    }

    async getMany(data?: BuildInput<Permission>): Promise<CollectionResourceResponse<Permission>> {
        const response = await this.driver.get(`permissions${buildQuery(data)}`);
        return response.data;
    }

    async delete(id: Permission['id']): Promise<SingleResourceResponse<Permission>> {
        const response = await this.driver.delete(`permissions/${id}`);

        return response.data;
    }

    async getOne(id: Permission['id'], record?: BuildInput<Permission>) {
        const response = await this.driver.get(`permissions/${id}`);

        return response.data;
    }

    async create(data: Partial<Permission>): Promise<SingleResourceResponse<Permission>> {
        const response = await this.driver.post('permissions', data);

        return response.data;
    }

    async update(id: Permission['id'], data: Partial<Permission>): Promise<SingleResourceResponse<Permission>> {
        const response = await this.driver.post(`permissions/${id}`, data);

        return response.data;
    }
}
