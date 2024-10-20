/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { UserPermission } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type { DomainAPISlim, ResourceCollectionResponse, ResourceResponse } from '../types-base';

export class UserPermissionAPI extends BaseAPI implements DomainAPISlim<UserPermission> {
    async getMany(data?: BuildInput<UserPermission>) : Promise<ResourceCollectionResponse<UserPermission>> {
        return this.client.get(`user-permissions${buildQuery(data)}`);
    }

    async getOne(id: UserPermission['id']) : Promise<ResourceResponse<UserPermission>> {
        return this.client.get(`user-permissions/${id}`);
    }

    async delete(id: UserPermission['id']) : Promise<ResourceResponse<UserPermission>> {
        return this.client.delete(`user-permissions/${id}`);
    }

    async create(data: Partial<UserPermission>) : Promise<ResourceResponse<UserPermission>> {
        return this.client.post('user-permissions', nullifyEmptyObjectProperties(data));
    }
}
