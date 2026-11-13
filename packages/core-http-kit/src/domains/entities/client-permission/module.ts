/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { ClientPermission } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntitySchemaResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ClientPermissionCreatePayload,
    ClientPermissionUpdatePayload,
    IClientPermissionAPI,
} from './types';
import { buildRequestConfig } from '../../utils';

export class ClientPermissionAPI extends BaseAPI implements IClientPermissionAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('client-permissions/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<ClientPermission>, options?: APIRequestOptions) : Promise<EntityCollectionResponse<ClientPermission>> {
        const response = await this.client.get(`client-permissions${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: ClientPermission['id'], data?: EntityQueryInput<ClientPermission>, options?: APIRequestOptions) : Promise<EntityRecordResponse<ClientPermission>> {
        const response = await this.client.get(`client-permissions/${id}${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: ClientPermission['id'], options?: APIRequestOptions) : Promise<EntityRecordResponse<ClientPermission>> {
        const response = await this.client.delete(`client-permissions/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: ClientPermissionCreatePayload, options?: APIRequestOptions) : Promise<EntityRecordResponse<ClientPermission>> {
        const response = await this.client.post('client-permissions', data, buildRequestConfig(options));

        return response.data;
    }

    async update(id: ClientPermission['id'], data: ClientPermissionUpdatePayload, options?: APIRequestOptions) : Promise<EntityRecordResponse<ClientPermission>> {
        const response = await this.client.post(`client-permissions/${id}`, data, buildRequestConfig(options));

        return response.data;
    }
}
