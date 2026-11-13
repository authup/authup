/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Session } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { ISessionAPI, SessionDeleteManyResponse } from './types';
import { buildRequestConfig } from '../../utils';

export class SessionAPI extends BaseAPI implements ISessionAPI {
    async getStats(query: EntityStatsQuery<Session> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('sessions', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('sessions/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<Session>, options?: APIRequestOptions): Promise<EntityCollectionResponse<Session>> {
        const response = await this.client.get(`sessions${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: Session['id'], record?: EntityQueryInput<Session>, options?: APIRequestOptions): Promise<EntityRecordResponse<Session>> {
        const response = await this.client.get(`sessions/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: Session['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<Session>> {
        const response = await this.client.delete(`sessions/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async deleteMany(data?: EntityQueryInput<Session>, options?: APIRequestOptions): Promise<SessionDeleteManyResponse> {
        const response = await this.client.delete(`sessions${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }
}
