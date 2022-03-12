/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientDriverInstance } from '@trapi/client';
import { BuildInput, buildQuery } from '@trapi/query';
import { UserPermission } from './entity';
import { CollectionResourceResponse, DomainAPISlim, SingleResourceResponse } from '../type';
import { nullifyEmptyObjectProperties } from '../../utils';

export class UserPermissionAPI implements DomainAPISlim<UserPermission> {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    async getMany(data?: BuildInput<UserPermission>) : Promise<CollectionResourceResponse<UserPermission>> {
        const response = await this.client.get(`user-permissions${buildQuery(data)}`);
        return response.data;
    }

    async getOne(id: UserPermission['id']) : Promise<SingleResourceResponse<UserPermission>> {
        const response = await this.client.get(`user-permissions/${id}`);

        return response.data;
    }

    async delete(id: UserPermission['id']) : Promise<SingleResourceResponse<UserPermission>> {
        const response = await this.client.delete(`user-permissions/${id}`);

        return response.data;
    }

    async create(data: Partial<UserPermission>) : Promise<SingleResourceResponse<UserPermission>> {
        const response = await this.client.post('user-permissions', nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
