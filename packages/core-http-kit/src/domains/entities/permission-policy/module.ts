/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers/index.ts';
import { buildQueryString, encodePathSegment } from '../../../helpers/index.ts';
import type { PermissionPolicy } from '@authup/core-kit';
import { BaseAPI } from '../../base.ts';
import type { EntitySchemaResponse } from '../../stats/index.ts';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base.ts';
import type {
    IPermissionPolicyAPI,
    PermissionPolicyCreatePayload,
} from './types.ts';
import { buildRequestConfig } from '../../utils.ts';

export class PermissionPolicyAPI extends BaseAPI implements IPermissionPolicyAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('permission-policies/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data?: EntityQueryInput<PermissionPolicy>, options?: APIRequestOptions) : Promise<EntityCollectionResponse<PermissionPolicy>> {
        const response = await this.client.get(`permission-policies${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: PermissionPolicy['id'], record?: EntityQueryInput<PermissionPolicy>, options?: APIRequestOptions) : Promise<EntityRecordResponse<PermissionPolicy>> {
        const response = await this.client.get(`permission-policies/${encodePathSegment(id)}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: PermissionPolicy['id'], options?: APIRequestOptions) : Promise<EntityRecordResponse<PermissionPolicy>> {
        const response = await this.client.delete(`permission-policies/${encodePathSegment(id)}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: PermissionPolicyCreatePayload, options?: APIRequestOptions) : Promise<EntityRecordResponse<PermissionPolicy>> {
        const response = await this.client.post('permission-policies', data, buildRequestConfig(options));

        return response.data;
    }
}
