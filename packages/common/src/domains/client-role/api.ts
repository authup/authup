/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { AxiosInstance } from 'axios';
import { ClientRole } from './entity';
import { CollectionResourceResponse, SingleResourceResponse } from '../type';

export class ClientRoleAPI {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async getMany(data: BuildInput<ClientRole>): Promise<CollectionResourceResponse<ClientRole>> {
        const response = await this.client.get(`client-roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: typeof ClientRole.prototype.id): Promise<SingleResourceResponse<ClientRole>> {
        const response = await this.client.get(`client-roles/${id}`);

        return response.data;
    }

    async delete(id: typeof ClientRole.prototype.id): Promise<SingleResourceResponse<ClientRole>> {
        const response = await this.client.delete(`client-roles/${id}`);

        return response.data;
    }

    async create(data: Partial<ClientRole>): Promise<SingleResourceResponse<ClientRole>> {
        const response = await this.client.post('client-roles', data);

        return response.data;
    }
}
