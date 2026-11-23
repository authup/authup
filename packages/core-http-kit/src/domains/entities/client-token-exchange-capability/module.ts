/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers/index.ts';
import { buildQueryString, encodePathSegment } from '../../../helpers/index.ts';
import type { ClientTokenExchangeCapability } from '@authup/core-kit';
import { BaseAPI } from '../../base.ts';
import type { EntitySchemaResponse } from '../../stats/index.ts';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base.ts';
import type {
    ClientTokenExchangeCapabilityCreatePayload,
    ClientTokenExchangeCapabilityUpdatePayload,
    IClientTokenExchangeCapabilityAPI,
} from './types.ts';
import { buildRequestConfig } from '../../utils.ts';

export class ClientTokenExchangeCapabilityAPI extends BaseAPI implements IClientTokenExchangeCapabilityAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('client-token-exchange-capabilities/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(
        data?: EntityQueryInput<ClientTokenExchangeCapability>,
        options?: APIRequestOptions,
    ): Promise<EntityCollectionResponse<ClientTokenExchangeCapability>> {
        const response = await this.client.get(`client-token-exchange-capabilities${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(
        id: ClientTokenExchangeCapability['id'],
        record?: EntityQueryInput<ClientTokenExchangeCapability>,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const response = await this.client.get(`client-token-exchange-capabilities/${encodePathSegment(id)}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: ClientTokenExchangeCapability['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const response = await this.client.delete(`client-token-exchange-capabilities/${encodePathSegment(id)}`, buildRequestConfig(options));

        return response.data;
    }

    async create(
        data: ClientTokenExchangeCapabilityCreatePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const response = await this.client.post('client-token-exchange-capabilities', data, buildRequestConfig(options));

        return response.data;
    }

    async update(
        id: ClientTokenExchangeCapability['id'],
        data: ClientTokenExchangeCapabilityUpdatePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const response = await this.client.post(`client-token-exchange-capabilities/${encodePathSegment(id)}`, data, buildRequestConfig(options));

        return response.data;
    }
}
