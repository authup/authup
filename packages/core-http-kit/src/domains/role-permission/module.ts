/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { RolePermission } from '@authup/core-kit';
import { BaseAPI } from '../base';
import type { DomainAPISlim, ResourceCollectionResponse, ResourceResponse } from '../types-base';

export class RolePermissionAPI extends BaseAPI implements DomainAPISlim<RolePermission> {
    async getMany(data?: BuildInput<RolePermission>) : Promise<ResourceCollectionResponse<RolePermission>> {
        return this.client.get(`role-permissions${buildQuery(data)}`);
    }

    async getOne(id: RolePermission['id']) : Promise<ResourceResponse<RolePermission>> {
        return this.client.get(`role-permissions/${id}`);
    }

    async delete(id: RolePermission['id']) : Promise<ResourceResponse<RolePermission>> {
        return this.client.delete(`role-permissions/${id}`);
    }

    async create(data: Partial<RolePermission>) : Promise<ResourceResponse<RolePermission>> {
        return this.client.post('role-permissions', data);
    }
}
