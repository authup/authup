/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { buildRedisKeyPath } from '@authup/server-kit';
import { isUUID } from '@authup/kit';
import type { Robot } from '@authup/core-kit';
import type { IRobotIdentityRepository } from '../../../../core/index.ts';
import type { RobotRepository } from '../../../../adapters/database/domains/index.ts';
import { CachePrefix } from '../../../../adapters/database/domains/index.ts';

export class RobotIdentityRepository implements IRobotIdentityRepository {
    private readonly repository: RobotRepository;

    constructor(repository: RobotRepository) {
        this.repository = repository;
    }

    async findOneById(id: string): Promise<Robot | null> {
        return this.find(id);
    }

    async findOneByName(id: string, realm?: string): Promise<Robot | null> {
        return this.find(id, realm);
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Robot | null> {
        return this.find(idOrName, realm);
    }

    async findOneBy(where: Record<string, any>): Promise<Robot | null> {
        return this.repository.findOneBy(where);
    }

    private async find(key: string, realmKey?: string) : Promise<Robot | null> {
        const query = this.repository.createQueryBuilder('robot')
            .leftJoinAndSelect('robot.realm', 'realm');

        const isId = isUUID(key);
        if (isId) {
            query.where('robot.id = :id', { id: key });
        } else {
            query.where('robot.name = :name', { name: key });

            if (realmKey) {
                if (isUUID(realmKey)) {
                    query.andWhere('robot.realm_id = :realmId', { realmId: realmKey });
                } else {
                    query.andWhere('realm.name = :realmName', { realmName: realmKey });
                }
            }
        }

        const { columns } = this.repository.metadata;
        for (const column of columns) {
            if (!column.isSelect) {
                query.addSelect(`robot.${column.databaseName}`);
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
