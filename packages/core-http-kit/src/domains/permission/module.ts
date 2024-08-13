/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Permission } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../types-base';

export class PermissionAPI extends BaseAPI implements DomainAPI<Permission> {
    async getMany(data?: BuildInput<Permission>): Promise<CollectionResourceResponse<Permission>> {
        const response = await this.client.get(`permissions${buildQuery(data)}`);
        return response.data;
    }

    async delete(id: Permission['id']): Promise<SingleResourceResponse<Permission>> {
        const response = await this.client.delete(`permissions/${id}`);

        return response.data;
    }

    async getOne(id: Permission['id'], record?: BuildInput<Permission>) {
        const response = await this.client.get(`permissions/${id}${buildQuery(record)}`);

        return response.data;
    }

    async create(data: Partial<Permission>): Promise<SingleResourceResponse<Permission>> {
        const response = await this.client.post('permissions', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Permission['id'], data: Partial<Permission>): Promise<SingleResourceResponse<Permission>> {
        const response = await this.client.post(`permissions/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<Permission>,
    ): Promise<SingleResourceResponse<Permission>> {
        const response = await this.client.post(`permissions/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
