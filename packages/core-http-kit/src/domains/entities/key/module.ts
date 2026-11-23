/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers/index.ts';
import { buildQueryString, encodePathSegment } from '../../../helpers/index.ts';
import type { Key } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils/index.ts';
import { BaseAPI } from '../../base.ts';
import { buildStatsURL } from '../../stats/index.ts';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats/index.ts';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base.ts';
import type {
    IKeyAPI,
    KeyCreatePayload,
    KeyDeleteOptions,
    KeyUpdatePayload,
} from './types.ts';
import { buildRequestConfig } from '../../utils.ts';

export class KeyAPI extends BaseAPI implements IKeyAPI {
    async getStats(query: EntityStatsQuery<Key> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('keys', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('keys/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<Key>, options?: APIRequestOptions): Promise<EntityCollectionResponse<Key>> {
        const response = await this.client.get(`keys${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: Key['id'], record?: EntityQueryInput<Key>, options?: APIRequestOptions): Promise<EntityRecordResponse<Key>> {
        const response = await this.client.get(`keys/${encodePathSegment(id)}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: KeyCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Key>> {
        const response = await this.client.post('keys', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(id: Key['id'], data: KeyUpdatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Key>> {
        const response = await this.client.post(`keys/${encodePathSegment(id)}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async delete(id: Key['id'], options?: KeyDeleteOptions): Promise<EntityRecordResponse<Key>> {
        const response = await this.client.delete(`keys/${encodePathSegment(id)}${options && options.force ? '?force=true' : ''}`, buildRequestConfig(options));

        return response.data;
    }
}
