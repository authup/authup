/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { AxiosInstance } from 'axios';
import { RolePermission } from './entity';
import { CollectionResourceResponse, SingleResourceResponse } from '../type';

export class RolePermissionAPI {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async getMany(data?: BuildInput<RolePermission>) : Promise<CollectionResourceResponse<RolePermission>> {
        const response = await this.client.get(`role-permissions${buildQuery(data)}`);
        return response.data;
    }

    async getOne(id: typeof RolePermission.prototype.id) : Promise<SingleResourceResponse<RolePermission>> {
        const response = await this.client.get(`role-permissions/${id}`);

        return response.data;
    }

    async delete(id: typeof RolePermission.prototype.id) : Promise<SingleResourceResponse<RolePermission>> {
        const response = await this.client.delete(`role-permissions/${id}`);

        return response.data;
    }

    async create(data: Partial<RolePermission>) : Promise<SingleResourceResponse<RolePermission>> {
        const response = await this.client.post('role-permissions', data);

        return response.data;
    }
}
