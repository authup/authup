/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Session } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { ISessionAPI, SessionDeleteManyResponse } from './types';

export class SessionAPI extends BaseAPI implements ISessionAPI {
    async getMany(data?: BuildInput<Session>): Promise<EntityCollectionResponse<Session>> {
        const response = await this.client.get(`sessions${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: Session['id'], record?: BuildInput<Session>): Promise<EntityRecordResponse<Session>> {
        const response = await this.client.get(`sessions/${id}${buildQuery(record)}`);

        return response.data;
    }

    async delete(id: Session['id']): Promise<EntityRecordResponse<Session>> {
        const response = await this.client.delete(`sessions/${id}`);

        return response.data;
    }

    async deleteMany(options: { userId?: string } = {}): Promise<SessionDeleteManyResponse> {
        const suffix = options.userId ? `?user_id=${encodeURIComponent(options.userId)}` : '';
        const response = await this.client.delete(`sessions${suffix}`);

        return response.data;
    }
}
