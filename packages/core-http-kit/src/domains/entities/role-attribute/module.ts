/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { RoleAttribute } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IRoleAttributeAPI,
    RoleAttributeCreatePayload,
    RoleAttributeUpdatePayload,
} from './types';

export class RoleAttributeAPI extends BaseAPI implements IRoleAttributeAPI {
    async getMany(data?: EntityQueryInput<RoleAttribute>): Promise<EntityCollectionResponse<RoleAttribute>> {
        const response = await this.client.get(`role-attributes${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(roleId: RoleAttribute['id'], record?: EntityQueryInput<RoleAttribute>): Promise<EntityRecordResponse<RoleAttribute>> {
        const response = await this.client.get(`role-attributes/${roleId}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(roleId: RoleAttribute['id']): Promise<EntityRecordResponse<RoleAttribute>> {
        const response = await this.client.delete(`role-attributes/${roleId}`);

        return response.data;
    }

    async create(data: RoleAttributeCreatePayload): Promise<EntityRecordResponse<RoleAttribute>> {
        const response = await this.client.post('role-attributes', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: RoleAttribute['id'], data: RoleAttributeUpdatePayload): Promise<EntityRecordResponse<RoleAttribute>> {
        const response = await this.client.post(`role-attributes/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
