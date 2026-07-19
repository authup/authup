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
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { ISessionAPI, SessionDeleteManyResponse } from './types';

export class SessionAPI extends BaseAPI implements ISessionAPI {
    async getMany(data?: EntityQueryInput<Session>): Promise<EntityCollectionResponse<Session>> {
        const response = await this.client.get(`sessions${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(id: Session['id'], record?: EntityQueryInput<Session>): Promise<EntityRecordResponse<Session>> {
        const response = await this.client.get(`sessions/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: Session['id']): Promise<EntityRecordResponse<Session>> {
        const response = await this.client.delete(`sessions/${id}`);

        return response.data;
    }

    async deleteMany(data?: EntityQueryInput<Session>): Promise<SessionDeleteManyResponse> {
        const response = await this.client.delete(`sessions${buildQueryString(data)}`);

        return response.data;
    }
}
