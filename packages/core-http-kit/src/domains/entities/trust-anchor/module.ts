/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TrustAnchor } from '@authup/core-kit';
import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ITrustAnchorAPI,
    TrustAnchorCreatePayload,
    TrustAnchorUpdatePayload,
} from './types';

export class TrustAnchorAPI extends BaseAPI implements ITrustAnchorAPI {
    async getMany(data?: BuildInput<TrustAnchor>): Promise<EntityCollectionResponse<TrustAnchor>> {
        const response = await this.client.get(`trust-anchors${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: TrustAnchor['id'], record?: BuildInput<TrustAnchor>): Promise<EntityRecordResponse<TrustAnchor>> {
        const response = await this.client.get(`trust-anchors/${id}${buildQuery(record)}`);

        return response.data;
    }

    async create(data: TrustAnchorCreatePayload): Promise<EntityRecordResponse<TrustAnchor>> {
        const response = await this.client.post('trust-anchors', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: TrustAnchor['id'], data: TrustAnchorUpdatePayload): Promise<EntityRecordResponse<TrustAnchor>> {
        const response = await this.client.post(`trust-anchors/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async delete(id: TrustAnchor['id']): Promise<EntityRecordResponse<TrustAnchor>> {
        const response = await this.client.delete(`trust-anchors/${id}`);

        return response.data;
    }
}
