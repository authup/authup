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
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';
import type {
    IUserRoleAPI,
    UserRoleCreatePayload,
} from './types';

export class UserRoleAPI extends BaseAPI implements IUserRoleAPI {
    async getMany(data: EntityQueryInput<UserRole> = {}): Promise<EntityCollectionResponse<UserRole>> {
        const response = await this.client.get(`user-roles${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(id: UserRole['id'], record?: EntityQueryInput<UserRole>): Promise<EntityRecordWrappedResponse<UserRole>> {
        const response = await this.client.get(`user-roles/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: UserRole['id']): Promise<EntityRecordWrappedResponse<UserRole>> {
        const response = await this.client.delete(`user-roles/${id}`);

        return response.data;
    }

    async create(data: UserRoleCreatePayload): Promise<EntityRecordWrappedResponse<UserRole>> {
        const response = await this.client.post('user-roles', data);

        return response.data;
    }
}
