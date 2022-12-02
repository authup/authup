/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityDescriptor, Robot,
    Role, buildPermissionDescriptorFromRelation, createNanoID,
} from '@authelion/common';

import { compare, hash } from '@authelion/server-common';
import {
    DataSource, EntityManager, InstanceChecker, Repository,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { RoleRepository } from '../role';
import { RobotEntity } from './entity';
import { RobotRoleEntity } from '../robot-role';
import { RobotPermissionEntity } from '../robot-permission';
import { CachePrefix } from '../../constants';

export class RobotRepository extends Repository<RobotEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(RobotEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
    }

    async getOwnedPermissions(
        id: Robot['id'],
    ) : Promise<AbilityDescriptor[]> {
        const permissions : AbilityDescriptor[] = await this.getSelfOwnedPermissions(id);

        const roles = await this.manager
            .getRepository(RobotRoleEntity)
            .find({
                where: {
                    robot_id: id,
                },
                cache: {
                    id: buildKeyPath({
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

    async getSelfOwnedPermissions(id: string) : Promise<AbilityDescriptor[]> {
        const repository = this.manager.getRepository(RobotPermissionEntity);

        const entities = await repository.find({
            where: {
                robot_id: id,
            },
            cache: {
                id: buildKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
                    id,
                }),
                milliseconds: 60.000,
            },
        });

        const result : AbilityDescriptor[] = [];
        for (let i = 0; i < entities.length; i++) {
            result.push(buildPermissionDescriptorFromRelation(entities[i]));
        }

        return result;
    }

    /**
     * Verify a client by id and secret.
     *
     * @param id
     * @param secret
     */
    async verifyCredentials(id: string, secret: string) : Promise<RobotEntity | undefined> {
        const entity = await this.createQueryBuilder('robot')
            .addSelect('robot.secret')
            .where('robot.id = :id', { id })
            .getOne();

        if (
            !entity ||
            !entity.secret
        ) {
            return undefined;
        }

        const verified = await compare(secret, entity.secret);
        if (!verified) {
            return undefined;
        }

        return entity;
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
}
