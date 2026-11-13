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
import type { EntitySchemaResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { ISessionTokenAPI, SessionTokenDeleteManyResponse } from './types';
import { buildRequestConfig } from '../../utils';

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
        const response = await this.client.get(`session-tokens/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: SessionToken['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<SessionToken>> {
        const response = await this.client.delete(`session-tokens/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async deleteMany(data: EntityQueryInput<SessionToken>, options?: APIRequestOptions): Promise<SessionTokenDeleteManyResponse> {
        const response = await this.client.delete(`session-tokens${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }
}
