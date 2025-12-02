/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME } from '@authup/core-kit';
import type { DataSource, EntityManager } from 'typeorm';
import { InstanceChecker, Repository } from 'typeorm';
import { RealmEntity } from './entity';

export class RealmRepository extends Repository<RealmEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(RealmEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
    }

    async getMaster() : Promise<RealmEntity> {
        const repository = this.manager.getRepository(RealmEntity);

        const entity = await repository.findOne({
            where: {
                name: REALM_MASTER_NAME,
            },
            cache: true,
        });

        if (!entity) {
            throw new Error(`The ${REALM_MASTER_NAME} does not exist.`);
        }

        return entity;
    }
}
