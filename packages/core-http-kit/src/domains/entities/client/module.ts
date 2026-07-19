/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Client } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ClientCreatePayload,
    ClientSavePayload,
    ClientUpdatePayload,
    IClientAPI,
} from './types';

export class ClientAPI extends BaseAPI implements IClientAPI {
    async getMany(
        options?: EntityQueryInput<Client>,
    ): Promise<EntityCollectionResponse<Client>> {
        const response = await this.client
            .get(`clients${buildQueryString(options)}`);

        return response.data;
    }

    async getOne(
        id: Client['id'],
        options?: EntityQueryInput<Client>,
    ): Promise<EntityRecordResponse<Client>> {
        const response = await this.client
            .get(`clients/${id}${buildQueryString(options)}`);

        return response.data;
    }

    async delete(
        id: Client['id'],
    ): Promise<EntityRecordResponse<Client>> {
        const response = await this.client
            .delete(`clients/${id}`);

        return response.data;
    }

    async create(
        data: ClientCreatePayload,
    ): Promise<EntityRecordResponse<Client>> {
        const response = await this.client
            .post('clients', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: Client['id'],
        data: ClientUpdatePayload,
    ): Promise<EntityRecordResponse<Client>> {
        const response = await this.client.post(`clients/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: ClientSavePayload,
    ): Promise<EntityRecordResponse<Client>> {
        const response = await this.client.put(`clients/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
