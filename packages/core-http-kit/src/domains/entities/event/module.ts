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
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';
import type { IEventAPI } from './types';

export class EventAPI extends BaseAPI implements IEventAPI {
    async getMany(data?: EntityQueryInput<Event>): Promise<EntityCollectionResponse<Event>> {
        const response = await this.client.get(`events${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(id: Event['id'], record?: EntityQueryInput<Event>): Promise<EntityRecordWrappedResponse<Event>> {
        const response = await this.client.get(`events/${id}${buildQueryString(record)}`);

        return response.data;
    }
}
