/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers/index.ts';
import { buildQueryString, encodePathSegment } from '../../../helpers/index.ts';
import type { SessionToken } from '@authup/core-kit';
import { BaseAPI } from '../../base.ts';
import type { EntitySchemaResponse } from '../../stats/index.ts';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base.ts';
import type { ISessionTokenAPI, SessionTokenDeleteManyResponse } from './types.ts';
import { buildRequestConfig } from '../../utils.ts';

export class SessionTokenAPI extends BaseAPI implements ISessionTokenAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('session-tokens/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<SessionToken>, options?: APIRequestOptions): Promise<EntityCollectionResponse<SessionToken>> {
        const response = await this.client.get(`session-tokens${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(
        id: SessionToken['id'],
        record?: EntityQueryInput<SessionToken>,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<SessionToken>> {
        const response = await this.client.get(`session-tokens/${encodePathSegment(id)}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: SessionToken['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<SessionToken>> {
        const response = await this.client.delete(`session-tokens/${encodePathSegment(id)}`, buildRequestConfig(options));

        return response.data;
    }

    async deleteMany(data: EntityQueryInput<SessionToken>, options?: APIRequestOptions): Promise<SessionTokenDeleteManyResponse> {
        const response = await this.client.delete(`session-tokens${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }
}
