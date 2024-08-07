/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Robot,
    Role,
} from '@authup/core-kit';
import {
    mergePermissionItems,
    transformPermissionRelationToPermissionItem,
} from '@authup/core-kit';
import {
    createNanoID,
    isUUID,
} from '@authup/kit';
import type { PermissionItem } from '@authup/permitus';
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
    ) : Promise<PermissionItem[]> {
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
                        key: id,
                    }),
                    milliseconds: 60_000,
                },
            });

        const roleIds: Role['id'][] = roles.map((userRole) => userRole.role_id);

        if (roleIds.length === 0) {
            return permissions;
        }

        const roleRepository = new RoleRepository(this.manager);
        permissions.push(...await roleRepository.getOwnedPermissionsByMany(roleIds));

        return mergePermissionItems(permissions);
    }

    async getSelfOwnedPermissions(id: string) : Promise<PermissionItem[]> {
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
                    key: id,
                }),
                milliseconds: 60_000,
            },
        });

        return entities.map((entity) => transformPermissionRelationToPermissionItem(entity));
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
