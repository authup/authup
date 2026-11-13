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
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ClientCreatePayload,
    ClientSavePayload,
    ClientSecretRotatePayload,
    ClientSecretRotateResponse,
    ClientUpdatePayload,
    IClientAPI,
} from './types';
import { buildRequestConfig } from '../../utils';

export class ClientAPI extends BaseAPI implements IClientAPI {
    async getStats(query: EntityStatsQuery<Client> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('clients', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('clients/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(
        options?: EntityQueryInput<Client>,
        requestOptions?: APIRequestOptions,
    ): Promise<EntityCollectionResponse<Client>> {
        const response = await this.client
            .get(`clients${buildQueryString(options)}`, buildRequestConfig(requestOptions));

        return response.data;
    }

    async getOne(
        id: Client['id'],
        options?: EntityQueryInput<Client>,
        requestOptions?: APIRequestOptions,
    ): Promise<EntityRecordResponse<Client>> {
        const response = await this.client
            .get(`clients/${id}${buildQueryString(options)}`, buildRequestConfig(requestOptions));

        return response.data;
    }

    async delete(
        id: Client['id'],
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<Client>> {
        const response = await this.client
            .delete(`clients/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async create(
        data: ClientCreatePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<Client>> {
        const response = await this.client
            .post('clients', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(
        id: Client['id'],
        data: ClientUpdatePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<Client>> {
        const response = await this.client.post(`clients/${id}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: ClientSavePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<Client>> {
        const response = await this.client.put(`clients/${idOrName}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async rotateSecret(
        id: Client['id'],
        data: ClientSecretRotatePayload = {},
        options?: APIRequestOptions,
    ): Promise<ClientSecretRotateResponse> {
        const response = await this.client.post(`clients/${id}/secret`, data, buildRequestConfig(options));

        return response.data;
    }
}
