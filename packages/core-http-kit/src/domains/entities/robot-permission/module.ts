/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { RobotPermission } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type {
    EntityAPISlim, EntityCollectionResponse, EntityRecordResponse,
} from '../../types-base';

export class RobotPermissionAPI extends BaseAPI implements EntityAPISlim<RobotPermission> {
    async getMany(data?: BuildInput<RobotPermission>) : Promise<EntityCollectionResponse<RobotPermission>> {
        const response = await this.client.get(`robot-permissions${buildQuery(data)}`);
        return response.data;
    }

    async getOne(id: RobotPermission['id'], data?: BuildInput<RobotPermission>) : Promise<EntityRecordResponse<RobotPermission>> {
        const response = await this.client.get(`robot-permissions/${id}${buildQuery(data)}`);

        return response.data;
    }

    async delete(id: RobotPermission['id']) : Promise<EntityRecordResponse<RobotPermission>> {
        const response = await this.client.delete(`robot-permissions/${id}`);

        return response.data;
    }

    async create(data: Partial<RobotPermission>) : Promise<EntityRecordResponse<RobotPermission>> {
        const response = await this.client.post('robot-permissions', data);

        return response.data;
    }
}
