/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { AxiosInstance } from 'axios';
import { nullifyEmptyObjectProperties } from '../../utils';
import { Role } from './entity';
import { CollectionResourceResponse, SingleResourceResponse } from '../../http';

export class RoleAPIClient {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async getMany(data?: BuildInput<Role>): Promise<CollectionResourceResponse<Role>> {
        const response = await this.client.get(`roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(roleId: number): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.get(`roles/${roleId}`);

        return response.data;
    }

    async delete(roleId: number): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.delete(`roles/${roleId}`);

        return response.data;
    }

    async create(data: Pick<Role, 'name'>): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.post('roles', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: number, data: Pick<Role, 'name'>): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.post(`roles/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
