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
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { EventStatsQuery, EventStatsResponse, IEventAPI } from './types';

export class EventAPI extends BaseAPI implements IEventAPI {
    async getStats(query: EventStatsQuery = {}): Promise<EventStatsResponse> {
        const filters = buildQueryString<Event>(query.filters ? { filters: query.filters } : undefined);

        const params = new URLSearchParams();
        if (query.granularity) {
            params.set('granularity', query.granularity);
        }
        if (typeof query.days !== 'undefined') {
            params.set('days', `${query.days}`);
        }

        const own = params.toString();
        const search = [filters.replace(/^\?/, ''), own].filter(Boolean).join('&');
        const response = await this.client.get(`events/stats${search ? `?${search}` : ''}`);

        return response.data;
    }

    async getMany(data?: EntityQueryInput<Event>): Promise<EntityCollectionResponse<Event>> {
        const response = await this.client.get(`events${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(id: Event['id'], record?: EntityQueryInput<Event>): Promise<EntityRecordResponse<Event>> {
        const response = await this.client.get(`events/${id}${buildQueryString(record)}`);

        return response.data;
    }
}
