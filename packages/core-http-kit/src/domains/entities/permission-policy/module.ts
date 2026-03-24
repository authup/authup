/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { PermissionPolicy } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityAPISlim, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export class PermissionPolicyAPI extends BaseAPI implements EntityAPISlim<PermissionPolicy> {
    async getMany(data?: BuildInput<PermissionPolicy>) : Promise<EntityCollectionResponse<PermissionPolicy>> {
        const response = await this.client.get(`permission-policies${buildQuery(data)}`);
        return response.data;
    }

    async getOne(id: PermissionPolicy['id']) : Promise<EntityRecordResponse<PermissionPolicy>> {
        const response = await this.client.get(`permission-policies/${id}`);

        return response.data;
    }

    async delete(id: PermissionPolicy['id']) : Promise<EntityRecordResponse<PermissionPolicy>> {
        const response = await this.client.delete(`permission-policies/${id}`);

        return response.data;
    }

    async create(data: Partial<PermissionPolicy>) : Promise<EntityRecordResponse<PermissionPolicy>> {
        const response = await this.client.post('permission-policies', data);

        return response.data;
    }
}
