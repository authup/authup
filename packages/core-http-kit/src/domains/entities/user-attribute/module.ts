/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers/index.ts';
import { buildQueryString, encodePathSegment } from '../../../helpers/index.ts';
import type { UserAttribute } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils/index.ts';
import { BaseAPI } from '../../base.ts';
import type { EntitySchemaResponse } from '../../stats/index.ts';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base.ts';
import type {
    IUserAttributeAPI,
    UserAttributeCreatePayload,
    UserAttributeUpdatePayload,
} from './types.ts';
import { buildRequestConfig } from '../../utils.ts';

export class UserAttributeAPI extends BaseAPI implements IUserAttributeAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('user-attributes/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<UserAttribute>, options?: APIRequestOptions): Promise<EntityCollectionResponse<UserAttribute>> {
        const response = await this.client.get(`user-attributes${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(roleId: UserAttribute['id'], record?: EntityQueryInput<UserAttribute>, options?: APIRequestOptions): Promise<EntityRecordResponse<UserAttribute>> {
        const response = await this.client.get(`user-attributes/${encodePathSegment(roleId)}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(roleId: UserAttribute['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<UserAttribute>> {
        const response = await this.client.delete(`user-attributes/${encodePathSegment(roleId)}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: UserAttributeCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<UserAttribute>> {
        const response = await this.client.post('user-attributes', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(id: UserAttribute['id'], data: UserAttributeUpdatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<UserAttribute>> {
        const response = await this.client.post(`user-attributes/${encodePathSegment(id)}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }
}
