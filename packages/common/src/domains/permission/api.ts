/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { AxiosInstance } from 'axios';
import { Permission } from './entity';
import { CollectionResourceResponse, SingleResourceResponse } from '../../http';

export class PermissionAPIClient {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async getMany(data?: BuildInput<Permission>): Promise<CollectionResourceResponse<Permission>> {
        const response = await this.client.get(`permissions${buildQuery(data)}`);
        return response.data;
    }

    async create(data: Pick<Permission, 'id'>): Promise<SingleResourceResponse<Permission>> {
        const response = await this.client.post('permissions', data);

        return response.data;
    }

    async update(id: typeof Permission.prototype.id, data: Pick<Permission, 'id'>): Promise<SingleResourceResponse<Permission>> {
        const response = await this.client.post(`permissions/${id}`, data);

        return response.data;
    }
}
