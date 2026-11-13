/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Path } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IPathAPI,
    PathCreatePayload,
    PathUpdatePayload,
} from './types';
import { buildRequestConfig } from '../../utils';

export class PathAPI extends BaseAPI implements IPathAPI {
    async getStats(query: EntityStatsQuery<Path> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('paths', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('paths/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<Path>, options?: APIRequestOptions): Promise<EntityCollectionResponse<Path>> {
        const response = await this.client.get(`paths${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: Path['id'], record?: EntityQueryInput<Path>, options?: APIRequestOptions): Promise<EntityRecordResponse<Path>> {
        const response = await this.client.get(`paths/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: Path['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<Path>> {
        const response = await this.client.delete(`paths/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: PathCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Path>> {
        const response = await this.client.post('paths', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(id: Path['id'], data: PathUpdatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<Path>> {
        const response = await this.client.post(`paths/${id}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }
}
