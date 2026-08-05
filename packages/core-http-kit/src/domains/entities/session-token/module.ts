/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { SessionToken } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { ISessionTokenAPI, SessionTokenDeleteManyResponse } from './types';

export class SessionTokenAPI extends BaseAPI implements ISessionTokenAPI {
    async getMany(data?: EntityQueryInput<SessionToken>): Promise<EntityCollectionResponse<SessionToken>> {
        const response = await this.client.get(`session-tokens${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(
        id: SessionToken['id'],
        record?: EntityQueryInput<SessionToken>,
    ): Promise<EntityRecordResponse<SessionToken>> {
        const response = await this.client.get(`session-tokens/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: SessionToken['id']): Promise<EntityRecordResponse<SessionToken>> {
        const response = await this.client.delete(`session-tokens/${id}`);

        return response.data;
    }

    async deleteMany(data: EntityQueryInput<SessionToken>): Promise<SessionTokenDeleteManyResponse> {
        const response = await this.client.delete(`session-tokens${buildQueryString(data)}`);

        return response.data;
    }
}
