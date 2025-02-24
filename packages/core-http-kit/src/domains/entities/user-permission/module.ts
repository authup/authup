/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { UserPermission } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityAPISlim, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export class UserPermissionAPI extends BaseAPI implements EntityAPISlim<UserPermission> {
    async getMany(data?: BuildInput<UserPermission>) : Promise<EntityCollectionResponse<UserPermission>> {
        const response = await this.client.get(`user-permissions${buildQuery(data)}`);
        return response.data;
    }

    async getOne(id: UserPermission['id']) : Promise<EntityRecordResponse<UserPermission>> {
        const response = await this.client.get(`user-permissions/${id}`);

        return response.data;
    }

    async delete(id: UserPermission['id']) : Promise<EntityRecordResponse<UserPermission>> {
        const response = await this.client.delete(`user-permissions/${id}`);

        return response.data;
    }

    async create(data: Partial<UserPermission>) : Promise<EntityRecordResponse<UserPermission>> {
        const response = await this.client.post('user-permissions', nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
