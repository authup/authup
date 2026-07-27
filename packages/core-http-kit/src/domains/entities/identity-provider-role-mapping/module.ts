/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';
import type {
    IIdentityProviderRoleMappingAPI,
    IdentityProviderRoleMappingCreatePayload,
    IdentityProviderRoleMappingUpdatePayload,
} from './types';

export class IdentityProviderRoleMappingAPI extends BaseAPI implements IIdentityProviderRoleMappingAPI {
    async getMany(data: EntityQueryInput<IdentityProviderRoleMapping>): Promise<EntityCollectionResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.get(`identity-provider-role-mappings${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(id: IdentityProviderRoleMapping['id'], record?: EntityQueryInput<IdentityProviderRoleMapping>): Promise<EntityRecordWrappedResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.get(`identity-provider-role-mappings/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: IdentityProviderRoleMapping['id']): Promise<EntityRecordWrappedResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.delete(`identity-provider-role-mappings/${id}`);

        return response.data;
    }

    async create(data: IdentityProviderRoleMappingCreatePayload): Promise<EntityRecordWrappedResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.post('identity-provider-role-mappings', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: IdentityProviderRoleMapping['id'],
        data: IdentityProviderRoleMappingUpdatePayload,
    ): Promise<EntityRecordWrappedResponse<IdentityProviderRoleMapping>> {
        const response = await this.client.post(`identity-provider-role-mappings/${id}`, data);

        return response.data;
    }
}
