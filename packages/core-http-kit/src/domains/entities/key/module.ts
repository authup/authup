/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Key } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IKeyAPI,
    KeyCreatePayload,
    KeyDeleteOptions,
    KeyUpdatePayload,
} from './types';

export class KeyAPI extends BaseAPI implements IKeyAPI {
    async getMany(data?: EntityQueryInput<Key>): Promise<EntityCollectionResponse<Key>> {
        const response = await this.client.get(`keys${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(id: Key['id'], record?: EntityQueryInput<Key>): Promise<EntityRecordResponse<Key>> {
        const response = await this.client.get(`keys/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async create(data: KeyCreatePayload): Promise<EntityRecordResponse<Key>> {
        const response = await this.client.post('keys', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Key['id'], data: KeyUpdatePayload): Promise<EntityRecordResponse<Key>> {
        const response = await this.client.post(`keys/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async delete(id: Key['id'], options?: KeyDeleteOptions): Promise<EntityRecordResponse<Key>> {
        const response = await this.client.delete(`keys/${id}${options && options.force ? '?force=true' : ''}`);

        return response.data;
    }
}
