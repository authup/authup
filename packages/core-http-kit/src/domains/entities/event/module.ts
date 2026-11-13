/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Event } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { EventStatsQuery, EventStatsResponse, IEventAPI } from './types';
import { buildRequestConfig } from '../../utils';

export class EventAPI extends BaseAPI implements IEventAPI {
    async getStats(query: EventStatsQuery = {}, options?: APIRequestOptions): Promise<EventStatsResponse> {
        const response = await this.client.get(buildStatsURL<Event>('events', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('events/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<Event>, options?: APIRequestOptions): Promise<EntityCollectionResponse<Event>> {
        const response = await this.client.get(`events${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: Event['id'], record?: EntityQueryInput<Event>, options?: APIRequestOptions): Promise<EntityRecordResponse<Event>> {
        const response = await this.client.get(`events/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }
}
