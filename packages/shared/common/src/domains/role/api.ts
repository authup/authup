/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { ClientDriverInstance } from 'hapic';
import { nullifyEmptyObjectProperties } from '../../utils';
import { Role } from './entity';
import {
    CollectionResourceResponse, DomainAPI, SingleResourceResponse,
} from '../type';

export class RoleAPI implements DomainAPI<Role> {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    async getMany(data?: BuildInput<Role>): Promise<CollectionResourceResponse<Role>> {
        const response = await this.client.get(`roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(roleId: Role['id']): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.get(`roles/${roleId}`);

        return response.data;
    }

    async delete(roleId: Role['id']): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.delete(`roles/${roleId}`);

        return response.data;
    }

    async create(data: Partial<Role>): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.post('roles', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Role['id'], data: Partial<Role>): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.post(`roles/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
