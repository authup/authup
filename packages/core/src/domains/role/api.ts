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
import type { Role } from './types';
import type {
    CollectionResourceResponse, DomainAPI, SingleResourceResponse,
} from '../types-base';

export class RoleAPI implements DomainAPI<Role> {
    protected driver: Driver;

    constructor(client: Driver) {
        this.driver = client;
    }

    async getMany(data?: BuildInput<Role>): Promise<CollectionResourceResponse<Role>> {
        const response = await this.driver.get(`roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(roleId: Role['id']): Promise<SingleResourceResponse<Role>> {
        const response = await this.driver.get(`roles/${roleId}`);

        return response.data;
    }

    async delete(roleId: Role['id']): Promise<SingleResourceResponse<Role>> {
        const response = await this.driver.delete(`roles/${roleId}`);

        return response.data;
    }

    async create(data: Partial<Role>): Promise<SingleResourceResponse<Role>> {
        const response = await this.driver.post('roles', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Role['id'], data: Partial<Role>): Promise<SingleResourceResponse<Role>> {
        const response = await this.driver.post(`roles/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
