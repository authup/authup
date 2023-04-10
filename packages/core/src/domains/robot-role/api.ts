/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Driver } from 'hapic';
import type { RobotRole } from './types';
import type {
    CollectionResourceResponse, DomainAPISlim, SingleResourceResponse,
} from '../types-base';

export class RobotRoleAPI implements DomainAPISlim<RobotRole> {
    protected driver: Driver;

    constructor(client: Driver) {
        this.driver = client;
    }

    async getMany(data: BuildInput<RobotRole>): Promise<CollectionResourceResponse<RobotRole>> {
        const response = await this.driver.get(`robot-roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: RobotRole['id']): Promise<SingleResourceResponse<RobotRole>> {
        const response = await this.driver.get(`robot-roles/${id}`);

        return response.data;
    }

    async delete(id: RobotRole['id']): Promise<SingleResourceResponse<RobotRole>> {
        const response = await this.driver.delete(`robot-roles/${id}`);

        return response.data;
    }

    async create(data: Partial<RobotRole>): Promise<SingleResourceResponse<RobotRole>> {
        const response = await this.driver.post('robot-roles', data);

        return response.data;
    }
}
