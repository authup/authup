/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Consent } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';
import type { IConsentAPI } from './types';

export class ConsentAPI extends BaseAPI implements IConsentAPI {
    async getMany(data?: EntityQueryInput<Consent>): Promise<EntityCollectionResponse<Consent>> {
        const response = await this.client.get(`consents${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(id: Consent['id'], record?: EntityQueryInput<Consent>): Promise<EntityRecordWrappedResponse<Consent>> {
        const response = await this.client.get(`consents/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: Consent['id']): Promise<EntityRecordWrappedResponse<Consent>> {
        const response = await this.client.delete(`consents/${id}`);

        return response.data;
    }
}
