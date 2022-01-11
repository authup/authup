/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { AxiosInstance } from 'axios';
import { UserRole } from './entity';
import { CollectionResourceResponse, SingleResourceResponse } from '../type';

export class UserRoleAPI {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async getMany(data: BuildInput<UserRole>): Promise<CollectionResourceResponse<UserRole>> {
        const response = await this.client.get(`user-roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: UserRole['id']): Promise<SingleResourceResponse<UserRole>> {
        const response = await this.client.get(`user-roles/${id}`);

        return response.data;
    }

    async delete(id: UserRole['id']): Promise<SingleResourceResponse<UserRole>> {
        const response = await this.client.delete(`user-roles/${id}`);

        return response.data;
    }

    async create(data: Partial<UserRole>): Promise<SingleResourceResponse<UserRole>> {
        const response = await this.client.post('user-roles', data);

        return response.data;
    }
}
