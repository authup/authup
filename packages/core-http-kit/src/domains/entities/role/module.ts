/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Role } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IRoleAPI,
    RoleCreatePayload,
    RoleSavePayload,
    RoleUpdatePayload,
} from './types';
import { buildRequestConfig } from '../../utils';

export class RoleAPI extends BaseAPI implements IRoleAPI {
    async getStats(query: EntityStatsQuery<Role> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('roles', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('roles/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<Role>, options?: APIRequestOptions): Promise<EntityCollectionResponse<Role>> {
        const response = await this.client.get(`roles${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(roleId: Role['id'], record?: EntityQueryInput<Role>, options?: APIRequestOptions): Promise<EntityRecordResponse<Role>> {
        const response = await this.client.get(`roles/${roleId}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(roleId: Role['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<Role>> {
        const response = await this.client.delete(`roles/${roleId}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: RoleCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Role>> {
        const response = await this.client.post('roles', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(id: Role['id'], data: RoleUpdatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Role>> {
        const response = await this.client.post(`roles/${id}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: RoleSavePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<Role>> {
        const response = await this.client.put(`roles/${idOrName}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }
}
