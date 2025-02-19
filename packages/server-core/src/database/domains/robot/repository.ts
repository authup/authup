/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Permission,
    Robot,
    Role,
} from '@authup/core-kit';
import {
    createNanoID,
    isUUID,
} from '@authup/kit';
import { buildRedisKeyPath, compare, hash } from '@authup/server-kit';
import type { DataSource, EntityManager, FindOptionsWhere } from 'typeorm';
import { InstanceChecker, Repository } from 'typeorm';
import { CachePrefix } from '../constants';
import { RobotEntity } from './entity';
import { RobotRoleEntity } from '../robot-role';
import { RobotPermissionEntity } from '../robot-permission';

export class RobotRepository extends Repository<RobotEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(RobotEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
    }

    async getBoundRoles(
        entity: string | Robot,
        clientId?: string | null,
    ) : Promise<Role[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const where : FindOptionsWhere<RobotRoleEntity> = {
            robot_id: id,
        };

        if (clientId) {
            where.role = {
                client_id: clientId,
            };
        }

        const entities = await this.manager
            .getRepository(RobotRoleEntity)
            .find({
                where,
                relations: {
                    role: true,
                },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.ROBOT_OWNED_ROLES,
                        key: id,
                    }),
                    milliseconds: 60_000,
                },
            });

        return entities.map((entity) => entity.role);
    }

    async getBoundPermissions(
        entity: string | Robot,
        clientId?: string | null,
    ) : Promise<Permission[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const repository = this.manager.getRepository(RobotPermissionEntity);

        const where : FindOptionsWhere<RobotPermissionEntity> = {
            robot_id: id,
        };

        if (clientId) {
            where.permission = {
                client_id: clientId,
            };
        }

        const entities = await repository.find({
            where,
            relations: {
                permission: true,
            },
            cache: {
                id: buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
                    key: id + (clientId ? `:${clientId}` : ''),
                }),
                milliseconds: 60_000,
            },
        });

        return entities.map((entity) => entity.permission);
    }

    /**
     * Verify a client by id/name and secret.
     *
     * @param idOrName
     * @param secret
     * @param realmId
     */
    async verifyCredentials(
        idOrName: string,
        secret: string,
        realmId?: string,
    ) : Promise<RobotEntity | undefined> {
        const query = this.createQueryBuilder('robot')
            .leftJoinAndSelect('robot.realm', 'realm');

        if (isUUID(idOrName)) {
            query.where('robot.id = :id', { id: idOrName });
        } else {
            query.where('robot.name LIKE :name', { name: idOrName });

            if (realmId) {
                query.andWhere('robot.realm_id = :realmId', { realmId });
            }
        }

        const entities = await query
            .addSelect('robot.secret')
            .getMany();

        for (let i = 0; i < entities.length; i++) {
            if (!entities[i].secret) {
                continue;
            }

            const verified = await this.verifySecret(secret, entities[i].secret);
            if (verified) {
                return entities[i];
            }
        }

        return undefined;
    }

    createSecret() {
        return createNanoID(64);
    }

    async hashSecret(secret: string) : Promise<string> {
        return hash(secret);
    }

    async verifySecret(secret: string, secretHashed: string) : Promise<boolean> {
        return compare(secret, secretHashed);
    }
}
