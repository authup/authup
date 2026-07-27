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
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';
import type {
    ITrustAnchorAPI,
    TrustAnchorCreatePayload,
    TrustAnchorUpdatePayload,
} from './types';

export class TrustAnchorAPI extends BaseAPI implements ITrustAnchorAPI {
    async getMany(data?: EntityQueryInput<TrustAnchor>): Promise<EntityCollectionResponse<TrustAnchor>> {
        const response = await this.client.get(`trust-anchors${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(id: TrustAnchor['id'], record?: EntityQueryInput<TrustAnchor>): Promise<EntityRecordWrappedResponse<TrustAnchor>> {
        const response = await this.client.get(`trust-anchors/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async create(data: TrustAnchorCreatePayload): Promise<EntityRecordWrappedResponse<TrustAnchor>> {
        const response = await this.client.post('trust-anchors', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: TrustAnchor['id'], data: TrustAnchorUpdatePayload): Promise<EntityRecordWrappedResponse<TrustAnchor>> {
        const response = await this.client.post(`trust-anchors/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async delete(id: TrustAnchor['id']): Promise<EntityRecordWrappedResponse<TrustAnchor>> {
        const response = await this.client.delete(`trust-anchors/${id}`);

        return response.data;
    }
}
