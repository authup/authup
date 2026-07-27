/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { PermissionPolicy } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IPermissionPolicyAPI,
    PermissionPolicyCreatePayload,
} from './types';

export class PermissionPolicyAPI extends BaseAPI implements IPermissionPolicyAPI {
    async getMany(data?: EntityQueryInput<PermissionPolicy>) : Promise<EntityCollectionResponse<PermissionPolicy>> {
        const response = await this.client.get(`permission-policies${buildQueryString(data)}`);
        return response.data;
    }

    async getOne(id: PermissionPolicy['id'], record?: EntityQueryInput<PermissionPolicy>) : Promise<EntityRecordResponse<PermissionPolicy>> {
        const response = await this.client.get(`permission-policies/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: PermissionPolicy['id']) : Promise<EntityRecordResponse<PermissionPolicy>> {
        const response = await this.client.delete(`permission-policies/${id}`);

        return response.data;
    }

    async create(data: PermissionPolicyCreatePayload) : Promise<EntityRecordResponse<PermissionPolicy>> {
        const response = await this.client.post('permission-policies', data);

        return response.data;
    }
}
