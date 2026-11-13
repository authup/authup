/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { UserRole } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntitySchemaResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IUserRoleAPI,
    UserRoleCreatePayload,
} from './types';
import { buildRequestConfig } from '../../utils';

export class UserRoleAPI extends BaseAPI implements IUserRoleAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('user-roles/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data: EntityQueryInput<UserRole> = {}, options?: APIRequestOptions): Promise<EntityCollectionResponse<UserRole>> {
        const response = await this.client.get(`user-roles${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: UserRole['id'], record?: EntityQueryInput<UserRole>, options?: APIRequestOptions): Promise<EntityRecordResponse<UserRole>> {
        const response = await this.client.get(`user-roles/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: UserRole['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<UserRole>> {
        const response = await this.client.delete(`user-roles/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: UserRoleCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<UserRole>> {
        const response = await this.client.post('user-roles', data, buildRequestConfig(options));

        return response.data;
    }
}
