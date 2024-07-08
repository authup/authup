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
    transformPermissionRelationToPermission,
} from '@authup/core-kit';
import {
    createNanoID,
    isUUID,
} from '@authup/kit';
import { buildRedisKeyPath, compare, hash } from '@authup/server-kit';
import type { DataSource, EntityManager } from 'typeorm';
import { InstanceChecker, Repository } from 'typeorm';
import { CachePrefix } from '../constants';
import { RoleRepository } from '../role';
import { RobotEntity } from './entity';
import { RobotRoleEntity } from '../robot-role';
import { RobotPermissionEntity } from '../robot-permission';

export class RobotRepository extends Repository<RobotEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(RobotEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
    }

    async getOwnedPermissions(
        id: Robot['id'],
    ) : Promise<Permission[]> {
        const permissions = await this.getSelfOwnedPermissions(id);

        const roles = await this.manager
            .getRepository(RobotRoleEntity)
            .find({
                where: {
                    robot_id: id,
                },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.ROBOT_OWNED_ROLES,
                        id,
                    }),
                    milliseconds: 60.000,
                },
            });

        const roleIds: Role['id'][] = roles.map((userRole) => userRole.role_id);

        if (roleIds.length === 0) {
            return permissions;
        }

        const roleRepository = new RoleRepository(this.manager);
        permissions.push(...await roleRepository.getOwnedPermissionsByMany(roleIds));

        return permissions;
    }

    async getSelfOwnedPermissions(id: string) : Promise<Permission[]> {
        const repository = this.manager.getRepository(RobotPermissionEntity);

        const entities = await repository.find({
            where: {
                robot_id: id,
            },
            relations: {
                policy: true,
                permission: {
                    policy: true,
                },
            },
            cache: {
                id: buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
                    id,
                }),
                milliseconds: 60.000,
            },
        });

        return entities.map((entity) => transformPermissionRelationToPermission(entity));
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

    async createWithSecret(data: Partial<Robot>) : Promise<{
        entity: RobotEntity,
        secret: string
    }> {
        const entity = this.create(data);

        const secret = entity.secret || createNanoID(64);
        entity.secret = await this.hashSecret(secret);

        return {
            entity,
            secret,
        };
    }

    async hashSecret(secret: string) : Promise<string> {
        return hash(secret);
    }

    async verifySecret(secret: string, secretHashed: string) : Promise<boolean> {
        return compare(secret, secretHashed);
    }
}
