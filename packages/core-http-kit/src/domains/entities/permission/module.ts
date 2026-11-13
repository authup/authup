/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Permission } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IPermissionAPI,
    PermissionAPICheckResponse,
    PermissionCreatePayload,
    PermissionSavePayload,
    PermissionUpdatePayload,
} from './types';
import { buildRequestConfig } from '../../utils';

export class PermissionAPI extends BaseAPI implements IPermissionAPI {
    async getStats(query: EntityStatsQuery<Permission> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('permissions', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('permissions/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<Permission>, options?: APIRequestOptions): Promise<EntityCollectionResponse<Permission>> {
        const response = await this.client.get(`permissions${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: Permission['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<Permission>> {
        const response = await this.client.delete(`permissions/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: Permission['id'], record?: EntityQueryInput<Permission>, options?: APIRequestOptions): Promise<EntityRecordResponse<Permission>> {
        const response = await this.client.get(`permissions/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: PermissionCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Permission>> {
        const response = await this.client.post('permissions', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(id: Permission['id'], data: PermissionUpdatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Permission>> {
        const response = await this.client.post(`permissions/${id}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: PermissionSavePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<Permission>> {
        const response = await this.client.put(`permissions/${idOrName}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async check(
        idOrName: string,
        data: Record<string, any> = {},
        options?: APIRequestOptions,
    ) : Promise<PermissionAPICheckResponse> {
        const response = await this.client.post(
            `permissions/${idOrName}/check`,
            nullifyEmptyObjectProperties(data),
            buildRequestConfig(options),
        );

        return response.data;
    }
}
