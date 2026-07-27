/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { Permission } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';
import type {
    IPermissionAPI,
    PermissionAPICheckResponse,
    PermissionCreatePayload,
    PermissionSavePayload,
    PermissionUpdatePayload,
} from './types';

export class PermissionAPI extends BaseAPI implements IPermissionAPI {
    async getMany(data?: EntityQueryInput<Permission>): Promise<EntityCollectionResponse<Permission>> {
        const response = await this.client.get(`permissions${buildQueryString(data)}`);
        return response.data;
    }

    async delete(id: Permission['id']): Promise<EntityRecordWrappedResponse<Permission>> {
        const response = await this.client.delete(`permissions/${id}`);

        return response.data;
    }

    async getOne(id: Permission['id'], record?: EntityQueryInput<Permission>): Promise<EntityRecordWrappedResponse<Permission>> {
        const response = await this.client.get(`permissions/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async create(data: PermissionCreatePayload): Promise<EntityRecordWrappedResponse<Permission>> {
        const response = await this.client.post('permissions', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Permission['id'], data: PermissionUpdatePayload): Promise<EntityRecordWrappedResponse<Permission>> {
        const response = await this.client.post(`permissions/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: PermissionSavePayload,
    ): Promise<EntityRecordWrappedResponse<Permission>> {
        const response = await this.client.put(`permissions/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async check(
        idOrName: string,
        data: Record<string, any> = {},
    ) : Promise<PermissionAPICheckResponse> {
        const response = await this.client.post(
            `permissions/${idOrName}/check`,
            nullifyEmptyObjectProperties(data),
        );

        return response.data;
    }
}
