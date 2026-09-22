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
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IPathAPI,
    PathCreatePayload,
    PathUpdatePayload,
} from './types';

export class PathAPI extends BaseAPI implements IPathAPI {
    async getStats(query: EntityStatsQuery<Path> = {}): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('paths', query));

        return response.data;
    }

    async getSchema(): Promise<EntitySchemaResponse> {
        const response = await this.client.get('paths/@schema');

        return response.data;
    }

    async getMany(data?: EntityQueryInput<Path>): Promise<EntityCollectionResponse<Path>> {
        const response = await this.client.get(`paths${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(id: Path['id'], record?: EntityQueryInput<Path>): Promise<EntityRecordResponse<Path>> {
        const response = await this.client.get(`paths/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: Path['id']): Promise<EntityRecordResponse<Path>> {
        const response = await this.client.delete(`paths/${id}`);

        return response.data;
    }

    async create(data: PathCreatePayload): Promise<EntityRecordResponse<Path>> {
        const response = await this.client.post('paths', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Path['id'], data: PathUpdatePayload): Promise<EntityRecordResponse<Path>> {
        const response = await this.client.post(`paths/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
