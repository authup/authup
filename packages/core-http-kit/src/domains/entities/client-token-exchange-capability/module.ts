/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { ClientTokenExchangeCapability } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntitySchemaResponse } from '../../stats';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ClientTokenExchangeCapabilityCreatePayload,
    ClientTokenExchangeCapabilityUpdatePayload,
    IClientTokenExchangeCapabilityAPI,
} from './types';

export class ClientTokenExchangeCapabilityAPI extends BaseAPI implements IClientTokenExchangeCapabilityAPI {
    async getSchema(): Promise<EntitySchemaResponse> {
        const response = await this.client.get('client-token-exchange-capabilities/@schema');

        return response.data;
    }

    async getMany(data?: EntityQueryInput<ClientTokenExchangeCapability>): Promise<EntityCollectionResponse<ClientTokenExchangeCapability>> {
        const response = await this.client.get(`client-token-exchange-capabilities${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(
        id: ClientTokenExchangeCapability['id'],
        record?: EntityQueryInput<ClientTokenExchangeCapability>,
    ): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const response = await this.client.get(`client-token-exchange-capabilities/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: ClientTokenExchangeCapability['id']): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const response = await this.client.delete(`client-token-exchange-capabilities/${id}`);

        return response.data;
    }

    async create(data: ClientTokenExchangeCapabilityCreatePayload): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const response = await this.client.post('client-token-exchange-capabilities', data);

        return response.data;
    }

    async update(
        id: ClientTokenExchangeCapability['id'],
        data: ClientTokenExchangeCapabilityUpdatePayload,
    ): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const response = await this.client.post(`client-token-exchange-capabilities/${id}`, data);

        return response.data;
    }
}
