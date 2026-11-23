/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers/index.ts';
import { buildQueryString, encodePathSegment } from '../../../helpers/index.ts';
import type { UserPermission } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils/index.ts';
import { BaseAPI } from '../../base.ts';
import type { EntitySchemaResponse } from '../../stats/index.ts';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base.ts';
import type {
    IUserPermissionAPI,
    UserPermissionCreatePayload,
    UserPermissionUpdatePayload,
} from './types.ts';
import { buildRequestConfig } from '../../utils.ts';

export class UserPermissionAPI extends BaseAPI implements IUserPermissionAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('user-permissions/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<UserPermission>, options?: APIRequestOptions) : Promise<EntityCollectionResponse<UserPermission>> {
        const response = await this.client.get(`user-permissions${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: UserPermission['id'], record?: EntityQueryInput<UserPermission>, options?: APIRequestOptions) : Promise<EntityRecordResponse<UserPermission>> {
        const response = await this.client.get(`user-permissions/${encodePathSegment(id)}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: UserPermission['id'], options?: APIRequestOptions) : Promise<EntityRecordResponse<UserPermission>> {
        const response = await this.client.delete(`user-permissions/${encodePathSegment(id)}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: UserPermissionCreatePayload, options?: APIRequestOptions) : Promise<EntityRecordResponse<UserPermission>> {
        const response = await this.client.post('user-permissions', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(id: UserPermission['id'], data: UserPermissionUpdatePayload, options?: APIRequestOptions) : Promise<EntityRecordResponse<UserPermission>> {
        const response = await this.client.post(`user-permissions/${encodePathSegment(id)}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }
}
