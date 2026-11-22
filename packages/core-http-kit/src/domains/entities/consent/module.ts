/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers/index.ts';
import { buildQueryString } from '../../../helpers/index.ts';
import type { Consent } from '@authup/core-kit';
import { BaseAPI } from '../../base.ts';
import type { EntitySchemaResponse } from '../../stats/index.ts';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base.ts';
import type { IConsentAPI } from './types.ts';
import { buildRequestConfig } from '../../utils.ts';

export class ConsentAPI extends BaseAPI implements IConsentAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('consents/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<Consent>, options?: APIRequestOptions): Promise<EntityCollectionResponse<Consent>> {
        const response = await this.client.get(`consents${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: Consent['id'], record?: EntityQueryInput<Consent>, options?: APIRequestOptions): Promise<EntityRecordResponse<Consent>> {
        const response = await this.client.get(`consents/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: Consent['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<Consent>> {
        const response = await this.client.delete(`consents/${id}`, buildRequestConfig(options));

        return response.data;
    }
}
