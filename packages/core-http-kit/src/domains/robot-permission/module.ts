/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { RobotPermission } from '@authup/core-kit';
import { BaseAPI } from '../base';
import type {
    DomainAPISlim, ResourceCollectionResponse, ResourceResponse,
} from '../types-base';

export class RobotPermissionAPI extends BaseAPI implements DomainAPISlim<RobotPermission> {
    async getMany(data?: BuildInput<RobotPermission>) : Promise<ResourceCollectionResponse<RobotPermission>> {
        return this.client.get(`robot-permissions${buildQuery(data)}`);
    }

    async getOne(id: RobotPermission['id'], data?: BuildInput<RobotPermission>) : Promise<ResourceResponse<RobotPermission>> {
        return this.client.get(`robot-permissions/${id}${buildQuery(data)}`);
    }

    async delete(id: RobotPermission['id']) : Promise<ResourceResponse<RobotPermission>> {
        return this.client.delete(`robot-permissions/${id}`);
    }

    async create(data: Partial<RobotPermission>) : Promise<ResourceResponse<RobotPermission>> {
        return this.client.post('robot-permissions', data);
    }
}
