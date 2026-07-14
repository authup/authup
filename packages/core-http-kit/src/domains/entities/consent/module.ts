/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Consent } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { IConsentAPI } from './types';

export class ConsentAPI extends BaseAPI implements IConsentAPI {
    async getMany(data?: BuildInput<Consent>): Promise<EntityCollectionResponse<Consent>> {
        const response = await this.client.get(`consents${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: Consent['id'], record?: BuildInput<Consent>): Promise<EntityRecordResponse<Consent>> {
        const response = await this.client.get(`consents/${id}${buildQuery(record)}`);

        return response.data;
    }

    async delete(id: Consent['id']): Promise<EntityRecordResponse<Consent>> {
        const response = await this.client.delete(`consents/${id}`);

        return response.data;
    }
}
