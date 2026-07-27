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
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';
import type {
    ClientScopeCreatePayload,
    IClientScopeAPI,
} from './types';

export class ClientScopeAPI extends BaseAPI implements IClientScopeAPI {
    async getMany(data?: EntityQueryInput<ClientScope>) : Promise<EntityCollectionResponse<ClientScope>> {
        const response = await this.client.get(`client-scopes${buildQueryString(data)}`);
        return response.data;
    }

    async getOne(id: ClientScope['id'], record?: EntityQueryInput<ClientScope>) : Promise<EntityRecordWrappedResponse<ClientScope>> {
        const response = await this.client.get(`client-scopes/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: ClientScope['id']) : Promise<EntityRecordWrappedResponse<ClientScope>> {
        const response = await this.client.delete(`client-scopes/${id}`);

        return response.data;
    }

    async create(data: ClientScopeCreatePayload) : Promise<EntityRecordWrappedResponse<ClientScope>> {
        const response = await this.client.post('client-scopes', data);

        return response.data;
    }
}
