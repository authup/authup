/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { buildRedisKeyPath } from '@authup/server-kit';
import { useDataSource } from 'typeorm-extension';
import { isUUID } from '@authup/kit';
import type { Robot } from '@authup/core-kit';
import type { IRobotIdentityRepository } from '../../../../core';
import { CachePrefix, RobotRepository } from '../../../../adapters/database/domains';

export class RobotIdentityRepository implements IRobotIdentityRepository {
    async findOneById(id: string): Promise<Robot | null> {
        return this.find(id);
    }

    async findOneByName(id: string, realm?: string): Promise<Robot | null> {
        return this.find(id, realm);
    }

    private async find(key: string, realmKey?: string) : Promise<Robot | null> {
        const dataSource = await useDataSource();
        const repository = new RobotRepository(dataSource);
        const query = repository.createQueryBuilder('robot')
            .leftJoinAndSelect('robot.realm', 'realm');

        const isId = isUUID(key);
        if (isId) {
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

        const { columns } = repository.metadata;
        for (let i = 0; i < columns.length; i++) {
            if (!columns[i].isSelect) {
                query.addSelect(`robot.${columns[i].databaseName}`);
            }
        }

        if (isId) {
            query.cache(
                buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT,
                    key,
                }),
                60_000,
            );
        }

        return query.getOne();
    }
}
