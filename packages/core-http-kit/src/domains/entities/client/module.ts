/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Client } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityAPI, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ClientCreatePayload,
    ClientSavePayload,
    ClientUpdatePayload,
} from './types';

export class ClientAPI extends BaseAPI implements EntityAPI<Client> {
    async getMany(
        options?: BuildInput<Client>,
    ): Promise<EntityCollectionResponse<Client>> {
        const response = await this.client
            .get(`clients${buildQuery(options)}`);

        return response.data;
    }

    async getOne(
        id: Client['id'],
        options?: BuildInput<Client>,
    ): Promise<EntityRecordResponse<Client>> {
        const response = await this.client
            .get(`clients/${id}${buildQuery(options)}`);

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
