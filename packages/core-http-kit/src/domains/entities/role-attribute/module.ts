/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers/index.ts';
import { buildQueryString, encodePathSegment } from '../../../helpers/index.ts';
import type { RoleAttribute } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils/index.ts';
import { BaseAPI } from '../../base.ts';
import type { EntitySchemaResponse } from '../../stats/index.ts';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base.ts';
import type {
    IRoleAttributeAPI,
    RoleAttributeCreatePayload,
    RoleAttributeUpdatePayload,
} from './types.ts';
import { buildRequestConfig } from '../../utils.ts';

export class RoleAttributeAPI extends BaseAPI implements IRoleAttributeAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('role-attributes/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<RoleAttribute>, options?: APIRequestOptions): Promise<EntityCollectionResponse<RoleAttribute>> {
        const response = await this.client.get(`role-attributes${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(roleId: RoleAttribute['id'], record?: EntityQueryInput<RoleAttribute>, options?: APIRequestOptions): Promise<EntityRecordResponse<RoleAttribute>> {
        const response = await this.client.get(`role-attributes/${encodePathSegment(roleId)}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(roleId: RoleAttribute['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<RoleAttribute>> {
        const response = await this.client.delete(`role-attributes/${encodePathSegment(roleId)}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: RoleAttributeCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<RoleAttribute>> {
        const response = await this.client.post('role-attributes', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(id: RoleAttribute['id'], data: RoleAttributeUpdatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<RoleAttribute>> {
        const response = await this.client.post(`role-attributes/${encodePathSegment(id)}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }
}
