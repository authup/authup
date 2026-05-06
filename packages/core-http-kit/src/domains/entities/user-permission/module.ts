/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { UserPermission } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityAPI, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    UserPermissionCreateInput,
    UserPermissionResponse,
    UserPermissionUpdateInput,
} from './types';

export class UserPermissionAPI extends BaseAPI implements EntityAPI<UserPermission> {
    async getMany(data?: BuildInput<UserPermission>) : Promise<EntityCollectionResponse<UserPermissionResponse>> {
        const response = await this.client.get(`user-permissions${buildQuery(data)}`);
        return response.data;
    }

    async getOne(id: UserPermission['id']) : Promise<EntityRecordResponse<UserPermissionResponse>> {
        const response = await this.client.get(`user-permissions/${id}`);

        return response.data;
    }

    async delete(id: UserPermission['id']) : Promise<EntityRecordResponse<UserPermissionResponse>> {
        const response = await this.client.delete(`user-permissions/${id}`);

        return response.data;
    }

    async create(data: UserPermissionCreateInput) : Promise<EntityRecordResponse<UserPermissionResponse>> {
        const response = await this.client.post('user-permissions', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: UserPermission['id'], data: UserPermissionUpdateInput) : Promise<EntityRecordResponse<UserPermissionResponse>> {
        const response = await this.client.post(`user-permissions/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
