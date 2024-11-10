/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { UserRole } from '@authup/core-kit';
import { BaseAPI } from '../base';
import type { CollectionResourceResponse, DomainAPISlim, SingleResourceResponse } from '../types-base';

export class UserRoleAPI extends BaseAPI implements DomainAPISlim<UserRole> {
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
