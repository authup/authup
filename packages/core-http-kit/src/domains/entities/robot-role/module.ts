/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { RobotRole } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type {
    EntityAPISlim, EntityCollectionResponse, EntityRecordResponse,
} from '../../types-base';

export class RobotRoleAPI extends BaseAPI implements EntityAPISlim<RobotRole> {
    async getMany(data: BuildInput<RobotRole> = {}): Promise<EntityCollectionResponse<RobotRole>> {
        const response = await this.client.get(`robot-roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: RobotRole['id']): Promise<EntityRecordResponse<RobotRole>> {
        const response = await this.client.get(`robot-roles/${id}`);

        return response.data;
    }

    async delete(id: RobotRole['id']): Promise<EntityRecordResponse<RobotRole>> {
        const response = await this.client.delete(`robot-roles/${id}`);

        return response.data;
    }

    async create(data: Partial<RobotRole>): Promise<EntityRecordResponse<RobotRole>> {
        const response = await this.client.post('robot-roles', data);

        return response.data;
    }
}
