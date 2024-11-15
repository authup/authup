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
import type { DomainAPISlim, ResourceCollectionResponse, ResourceResponse } from '../types-base';

export class UserRoleAPI extends BaseAPI implements DomainAPISlim<UserRole> {
    async getMany(data: BuildInput<UserRole>): Promise<ResourceCollectionResponse<UserRole>> {
        return this.client.get(`user-roles${buildQuery(data)}`);
    }

    async getOne(id: UserRole['id']): Promise<ResourceResponse<UserRole>> {
        return this.client.get(`user-roles/${id}`);
    }

    async delete(id: UserRole['id']): Promise<ResourceResponse<UserRole>> {
        return this.client.delete(`user-roles/${id}`);
    }

    async create(data: Partial<UserRole>): Promise<ResourceResponse<UserRole>> {
        return this.client.post('user-roles', data);
    }
}
