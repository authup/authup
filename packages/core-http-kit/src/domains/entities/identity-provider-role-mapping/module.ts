/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers/index.ts';
import { buildQueryString, encodePathSegment } from '../../../helpers/index.ts';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils/index.ts';
import { BaseAPI } from '../../base.ts';
import type { EntitySchemaResponse } from '../../stats/index.ts';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base.ts';
import type {
    IIdentityProviderRoleMappingAPI,
    IdentityProviderRoleMappingCreatePayload,
    IdentityProviderRoleMappingUpdatePayload,
} from './types.ts';
import { buildRequestConfig } from '../../utils.ts';

export class IdentityProviderRoleMappingAPI extends BaseAPI implements IIdentityProviderRoleMappingAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('identity-provider-role-mappings/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(
        data: EntityQueryInput<IdentityProviderRoleMapping>,
        options?: APIRequestOptions,
    ): Promise<EntityCollectionResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.get(`identity-provider-role-mappings${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: IdentityProviderRoleMapping['id'], record?: EntityQueryInput<IdentityProviderRoleMapping>, options?: APIRequestOptions): Promise<EntityRecordResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.get(`identity-provider-role-mappings/${encodePathSegment(id)}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: IdentityProviderRoleMapping['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.delete(`identity-provider-role-mappings/${encodePathSegment(id)}`, buildRequestConfig(options));

        return response.data;
    }

    async create(
        data: IdentityProviderRoleMappingCreatePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.post('identity-provider-role-mappings', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(
        id: IdentityProviderRoleMapping['id'],
        data: IdentityProviderRoleMappingUpdatePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.post(`identity-provider-role-mappings/${encodePathSegment(id)}`, data, buildRequestConfig(options));

        return response.data;
    }
}
