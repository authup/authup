/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { ClientTokenExchangePolicy } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntitySchemaResponse } from '../../stats';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ClientTokenExchangePolicyCreatePayload,
    ClientTokenExchangePolicyUpdatePayload,
    IClientTokenExchangePolicyAPI,
} from './types';

export class ClientTokenExchangePolicyAPI extends BaseAPI implements IClientTokenExchangePolicyAPI {
    async getSchema(): Promise<EntitySchemaResponse> {
        const response = await this.client.get('client-token-exchange-policies/@schema');

        return response.data;
    }

    async getMany(data?: EntityQueryInput<ClientTokenExchangePolicy>): Promise<EntityCollectionResponse<ClientTokenExchangePolicy>> {
        const response = await this.client.get(`client-token-exchange-policies${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(
        id: ClientTokenExchangePolicy['id'],
        record?: EntityQueryInput<ClientTokenExchangePolicy>,
    ): Promise<EntityRecordResponse<ClientTokenExchangePolicy>> {
        const response = await this.client.get(`client-token-exchange-policies/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: ClientTokenExchangePolicy['id']): Promise<EntityRecordResponse<ClientTokenExchangePolicy>> {
        const response = await this.client.delete(`client-token-exchange-policies/${id}`);

        return response.data;
    }

    async create(data: ClientTokenExchangePolicyCreatePayload): Promise<EntityRecordResponse<ClientTokenExchangePolicy>> {
        const response = await this.client.post('client-token-exchange-policies', data);

        return response.data;
    }

    async update(
        id: ClientTokenExchangePolicy['id'],
        data: ClientTokenExchangePolicyUpdatePayload,
    ): Promise<EntityRecordResponse<ClientTokenExchangePolicy>> {
        const response = await this.client.post(`client-token-exchange-policies/${id}`, data);

        return response.data;
    }
}
