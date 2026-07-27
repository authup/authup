/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { RolePermission } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IRolePermissionAPI,
    RolePermissionCreatePayload,
    RolePermissionUpdatePayload,
} from './types';

export class RolePermissionAPI extends BaseAPI implements IRolePermissionAPI {
    async getMany(data?: EntityQueryInput<RolePermission>) : Promise<EntityCollectionResponse<RolePermission>> {
        const response = await this.client.get(`role-permissions${buildQueryString(data)}`);
        return response.data;
    }

    async getOne(id: RolePermission['id'], record?: EntityQueryInput<RolePermission>) : Promise<EntityRecordResponse<RolePermission>> {
        const response = await this.client.get(`role-permissions/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: RolePermission['id']) : Promise<EntityRecordResponse<RolePermission>> {
        const response = await this.client.delete(`role-permissions/${id}`);

        return response.data;
    }

    async create(data: RolePermissionCreatePayload) : Promise<EntityRecordResponse<RolePermission>> {
        const response = await this.client.post('role-permissions', data);

        return response.data;
    }

    async update(id: RolePermission['id'], data: RolePermissionUpdatePayload) : Promise<EntityRecordResponse<RolePermission>> {
        const response = await this.client.post(`role-permissions/${id}`, data);

        return response.data;
    }
}
