/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Realm } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IRealmAPI,
    RealmCreatePayload,
    RealmRecordResponse,
    RealmSavePayload,
    RealmUpdatePayload,
} from './types';
import { buildRequestConfig } from '../../utils';

export class RealmAPI extends BaseAPI implements IRealmAPI {
    async getStats(query: EntityStatsQuery<Realm> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('realms', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('realms/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<Realm>, options?: APIRequestOptions): Promise<EntityCollectionResponse<Realm>> {
        const response = await this.client.get(`realms${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: Realm['id'], record?: EntityQueryInput<Realm>, options?: APIRequestOptions): Promise<RealmRecordResponse> {
        const response = await this.client.get(`realms/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: Realm['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<Realm>> {
        const response = await this.client.delete(`realms/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: RealmCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Realm>> {
        const response = await this.client.post('realms', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(realmId: Realm['id'], data: RealmUpdatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Realm>> {
        const response = await this.client.post(`realms/${realmId}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: RealmSavePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<Realm>> {
        const response = await this.client.put(`realms/${idOrName}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }
}
