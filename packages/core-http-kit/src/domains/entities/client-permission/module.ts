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
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';
import type {
    ClientPermissionCreatePayload,
    ClientPermissionUpdatePayload,
    IClientPermissionAPI,
} from './types';

export class ClientPermissionAPI extends BaseAPI implements IClientPermissionAPI {
    async getMany(data?: EntityQueryInput<ClientPermission>) : Promise<EntityCollectionResponse<ClientPermission>> {
        const response = await this.client.get(`client-permissions${buildQueryString(data)}`);
        return response.data;
    }

    async getOne(id: ClientPermission['id'], data?: EntityQueryInput<ClientPermission>) : Promise<EntityRecordWrappedResponse<ClientPermission>> {
        const response = await this.client.get(`client-permissions/${id}${buildQueryString(data)}`);

        return response.data;
    }

    async delete(id: ClientPermission['id']) : Promise<EntityRecordWrappedResponse<ClientPermission>> {
        const response = await this.client.delete(`client-permissions/${id}`);

        return response.data;
    }

    async create(data: ClientPermissionCreatePayload) : Promise<EntityRecordWrappedResponse<ClientPermission>> {
        const response = await this.client.post('client-permissions', data);

        return response.data;
    }

    async update(id: ClientPermission['id'], data: ClientPermissionUpdatePayload) : Promise<EntityRecordWrappedResponse<ClientPermission>> {
        const response = await this.client.post(`client-permissions/${id}`, data);

        return response.data;
    }
}
