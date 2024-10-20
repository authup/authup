/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { RobotRole } from '@authup/core-kit';
import { BaseAPI } from '../base';
import type {
    DomainAPISlim, ResourceCollectionResponse, ResourceResponse,
} from '../types-base';

export class RobotRoleAPI extends BaseAPI implements DomainAPISlim<RobotRole> {
    async getMany(data: BuildInput<RobotRole>): Promise<ResourceCollectionResponse<RobotRole>> {
        return this.client.get(`robot-roles${buildQuery(data)}`);
    }

    async getOne(id: RobotRole['id']): Promise<ResourceResponse<RobotRole>> {
        return this.client.get(`robot-roles/${id}`);
    }

    async delete(id: RobotRole['id']): Promise<ResourceResponse<RobotRole>> {
        return this.client.delete(`robot-roles/${id}`);
    }

    async create(data: Partial<RobotRole>): Promise<ResourceResponse<RobotRole>> {
        return this.client.post('robot-roles', data);
    }
}
