/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Permission } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type { DomainAPI, ResourceCollectionResponse, ResourceResponse } from '../types-base';
import type { PermissionAPICheckResponse } from './types';

export class PermissionAPI extends BaseAPI implements DomainAPI<Permission> {
    async getMany(data?: BuildInput<Permission>): Promise<ResourceCollectionResponse<Permission>> {
        return this.client.get(`permissions${buildQuery(data)}`);
    }

    async delete(id: Permission['id']): Promise<ResourceResponse<Permission>> {
        return this.client.delete(`permissions/${id}`);
    }

    async getOne(id: Permission['id'], record?: BuildInput<Permission>) {
        return this.client.get(`permissions/${id}${buildQuery(record)}`);
    }

    async create(data: Partial<Permission>): Promise<ResourceResponse<Permission>> {
        return this.client.post('permissions', nullifyEmptyObjectProperties(data));
    }

    async update(id: Permission['id'], data: Partial<Permission>): Promise<ResourceResponse<Permission>> {
        return this.client.post(`permissions/${id}`, nullifyEmptyObjectProperties(data));
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<Permission>,
    ): Promise<ResourceResponse<Permission>> {
        return this.client.put(`permissions/${idOrName}`, nullifyEmptyObjectProperties(data));
    }

    async check(
        idOrName: string,
        data: Record<string, any>,
    ) : Promise<PermissionAPICheckResponse> {
        return this.client.put(
            `permissions/${idOrName}/check`,
            nullifyEmptyObjectProperties(data),
        );
    }
}
