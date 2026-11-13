/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TrustAnchor } from '@authup/core-kit';
import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ITrustAnchorAPI,
    TrustAnchorCreatePayload,
    TrustAnchorUpdatePayload,
} from './types';
import { buildRequestConfig } from '../../utils';

export class TrustAnchorAPI extends BaseAPI implements ITrustAnchorAPI {
    async getStats(query: EntityStatsQuery<TrustAnchor> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('trust-anchors', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('trust-anchors/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<TrustAnchor>, options?: APIRequestOptions): Promise<EntityCollectionResponse<TrustAnchor>> {
        const response = await this.client.get(`trust-anchors${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: TrustAnchor['id'], record?: EntityQueryInput<TrustAnchor>, options?: APIRequestOptions): Promise<EntityRecordResponse<TrustAnchor>> {
        const response = await this.client.get(`trust-anchors/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: TrustAnchorCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<TrustAnchor>> {
        const response = await this.client.post('trust-anchors', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(id: TrustAnchor['id'], data: TrustAnchorUpdatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<TrustAnchor>> {
        const response = await this.client.post(`trust-anchors/${id}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async delete(id: TrustAnchor['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<TrustAnchor>> {
        const response = await this.client.delete(`trust-anchors/${id}`, buildRequestConfig(options));

        return response.data;
    }
}
