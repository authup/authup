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
import type { EntitySchemaResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IRolePermissionAPI,
    RolePermissionCreatePayload,
    RolePermissionUpdatePayload,
} from './types';
import { buildRequestConfig } from '../../utils';

export class RolePermissionAPI extends BaseAPI implements IRolePermissionAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('role-permissions/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<RolePermission>, options?: APIRequestOptions) : Promise<EntityCollectionResponse<RolePermission>> {
        const response = await this.client.get(`role-permissions${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: RolePermission['id'], record?: EntityQueryInput<RolePermission>, options?: APIRequestOptions) : Promise<EntityRecordResponse<RolePermission>> {
        const response = await this.client.get(`role-permissions/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: RolePermission['id'], options?: APIRequestOptions) : Promise<EntityRecordResponse<RolePermission>> {
        const response = await this.client.delete(`role-permissions/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: RolePermissionCreatePayload, options?: APIRequestOptions) : Promise<EntityRecordResponse<RolePermission>> {
        const response = await this.client.post('role-permissions', data, buildRequestConfig(options));

        return response.data;
    }

    async update(id: RolePermission['id'], data: RolePermissionUpdatePayload, options?: APIRequestOptions) : Promise<EntityRecordResponse<RolePermission>> {
        const response = await this.client.post(`role-permissions/${id}`, data, buildRequestConfig(options));

        return response.data;
    }
}
