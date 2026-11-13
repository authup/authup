/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { ClientScope } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntitySchemaResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ClientScopeCreatePayload,
    IClientScopeAPI,
} from './types';
import { buildRequestConfig } from '../../utils';

export class ClientScopeAPI extends BaseAPI implements IClientScopeAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('client-scopes/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<ClientScope>, options?: APIRequestOptions) : Promise<EntityCollectionResponse<ClientScope>> {
        const response = await this.client.get(`client-scopes${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: ClientScope['id'], record?: EntityQueryInput<ClientScope>, options?: APIRequestOptions) : Promise<EntityRecordResponse<ClientScope>> {
        const response = await this.client.get(`client-scopes/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: ClientScope['id'], options?: APIRequestOptions) : Promise<EntityRecordResponse<ClientScope>> {
        const response = await this.client.delete(`client-scopes/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: ClientScopeCreatePayload, options?: APIRequestOptions) : Promise<EntityRecordResponse<ClientScope>> {
        const response = await this.client.post('client-scopes', data, buildRequestConfig(options));

        return response.data;
    }
}
