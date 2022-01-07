/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { AxiosInstance } from 'axios';
import { ClientPermission } from './entity';
import { CollectionResourceResponse, SingleResourceResponse } from '../type';

export class ClientPermissionAPI {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async getMany(data?: BuildInput<ClientPermission>) : Promise<CollectionResourceResponse<ClientPermission>> {
        const response = await this.client.get(`client-permissions${buildQuery(data)}`);
        return response.data;
    }

    async getOne(id: typeof ClientPermission.prototype.id) : Promise<SingleResourceResponse<ClientPermission>> {
        const response = await this.client.get(`client-permissions/${id}`);

        return response.data;
    }

    async delete(id: typeof ClientPermission.prototype.id) : Promise<SingleResourceResponse<ClientPermission>> {
        const response = await this.client.delete(`client-permissions/${id}`);

        return response.data;
    }

    async create(data: Partial<ClientPermission>) : Promise<SingleResourceResponse<ClientPermission>> {
        const response = await this.client.post('client-permissions', data);

        return response.data;
    }
}
