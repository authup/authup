/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { ClientScope } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityAPISlim, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { ClientScopeCreateInput, ClientScopeResponse } from './types';

export class ClientScopeAPI extends BaseAPI implements EntityAPISlim<ClientScope> {
    async getMany(data?: BuildInput<ClientScope>) : Promise<EntityCollectionResponse<ClientScopeResponse>> {
        const response = await this.client.get(`client-scopes${buildQuery(data)}`);
        return response.data;
    }

    async getOne(id: ClientScope['id']) : Promise<EntityRecordResponse<ClientScopeResponse>> {
        const response = await this.client.get(`client-scopes/${id}`);

        return response.data;
    }

    async delete(id: ClientScope['id']) : Promise<EntityRecordResponse<ClientScopeResponse>> {
        const response = await this.client.delete(`client-scopes/${id}`);

        return response.data;
    }

    async create(data: ClientScopeCreateInput) : Promise<EntityRecordResponse<ClientScopeResponse>> {
        const response = await this.client.post('client-scopes', data);

        return response.data;
    }
}
