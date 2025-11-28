/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { RobotError } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { useDataSource } from 'typeorm-extension';
import { RobotCredentialsService } from '../../../credential';
import { BaseAuthenticationService } from '../../base';
import type { RobotEntity } from '../../../../database/domains';
import { RobotRepository } from '../../../../database/domains';

export class RobotAuthenticationService extends BaseAuthenticationService<RobotEntity> {
    protected credentialsService : RobotCredentialsService;

    constructor() {
        super();

        this.credentialsService = new RobotCredentialsService();
    }

    async authenticate(name: string | RobotEntity, secret: string, realmId?: string): Promise<RobotEntity> {
        let entity : RobotEntity;
        if (typeof name === 'string') {
            entity = await this.resolve(name, realmId);
            if (!entity) {
                throw RobotError.credentialsInvalid();
            }
        } else {
            entity = name;
        }

        const verified = await this.credentialsService.verify(secret, entity);
        if (!verified) {
            throw RobotError.credentialsInvalid();
        }

        if (!entity.active) {
            throw RobotError.inactive();
        }

        return entity;
    }

    async resolve(key: string, realmKey?: string): Promise<RobotEntity> {
        const dataSource = await useDataSource();
        const repository = new RobotRepository(dataSource);
        const query = repository.createQueryBuilder('robot')
            .leftJoinAndSelect('robot.realm', 'realm');

        if (isUUID(key)) {
            query.where('robot.id = :id', { id: key });
        } else {
            query.where('robot.name = :name', { name: key });

            if (realmKey) {
                if (isUUID(realmKey)) {
                    query.andWhere('robot.realm_id = :realmId', {
                        realmId: realmKey,
                    });
                } else {
                    query.andWhere('realm.name = :realmName', {
                        realmName: realmKey,
                    });
                }
            }
        }

        query.addSelect('robot.secret');

        return query.getOne();
    }
}
