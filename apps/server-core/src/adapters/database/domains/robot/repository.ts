/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource, EntityManager } from 'typeorm';
import { InstanceChecker, Repository } from 'typeorm';
import { RobotEntity } from './entity.ts';

export class RobotRepository extends Repository<RobotEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(RobotEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
    }
}
