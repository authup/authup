/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Scope } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';
import type {
    IScopeAPI,
    ScopeCreatePayload,
    ScopeSavePayload,
    ScopeUpdatePayload,
} from './types';

export class ScopeAPI extends BaseAPI implements IScopeAPI {
    async getMany(data?: EntityQueryInput<Scope>): Promise<EntityCollectionResponse<Scope>> {
        const response = await this.client.get(`scopes${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(id: Scope['id'], record?: EntityQueryInput<Scope>): Promise<EntityRecordWrappedResponse<Scope>> {
        const response = await this.client.get(`scopes/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: Scope['id']): Promise<EntityRecordWrappedResponse<Scope>> {
        const response = await this.client.delete(`scopes/${id}`);

        return response.data;
    }

    async create(data: ScopeCreatePayload): Promise<EntityRecordWrappedResponse<Scope>> {
        const response = await this.client.post('scopes', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Scope['id'], data: ScopeUpdatePayload): Promise<EntityRecordWrappedResponse<Scope>> {
        const response = await this.client.post(`scopes/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: ScopeSavePayload,
    ): Promise<EntityRecordWrappedResponse<Scope>> {
        const response = await this.client.put(`scopes/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
