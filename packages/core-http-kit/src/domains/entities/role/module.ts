/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Role } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IRoleAPI,
    RoleCreatePayload,
    RoleSavePayload,
    RoleUpdatePayload,
} from './types';

export class RoleAPI extends BaseAPI implements IRoleAPI {
    async getMany(data?: EntityQueryInput<Role>): Promise<EntityCollectionResponse<Role>> {
        const response = await this.client.get(`roles${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(roleId: Role['id'], record?: EntityQueryInput<Role>): Promise<EntityRecordResponse<Role>> {
        const response = await this.client.get(`roles/${roleId}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(roleId: Role['id']): Promise<EntityRecordResponse<Role>> {
        const response = await this.client.delete(`roles/${roleId}`);

        return response.data;
    }

    async create(data: RoleCreatePayload): Promise<EntityRecordResponse<Role>> {
        const response = await this.client.post('roles', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Role['id'], data: RoleUpdatePayload): Promise<EntityRecordResponse<Role>> {
        const response = await this.client.post(`roles/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: RoleSavePayload,
    ): Promise<EntityRecordResponse<Role>> {
        const response = await this.client.put(`roles/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
