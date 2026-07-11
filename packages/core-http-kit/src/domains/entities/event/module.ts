/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Event } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { IEventAPI } from './types';

export class EventAPI extends BaseAPI implements IEventAPI {
    async getMany(data?: BuildInput<Event>): Promise<EntityCollectionResponse<Event>> {
        const response = await this.client.get(`events${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: Event['id'], record?: BuildInput<Event>): Promise<EntityRecordResponse<Event>> {
        const response = await this.client.get(`events/${id}${buildQuery(record)}`);

        return response.data;
    }
}
