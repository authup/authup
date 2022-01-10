/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityRepository, Repository } from 'typeorm';
import { PermissionItem } from '@typescript-auth/core';

import {
    Robot, RobotPermission, RobotRole, Role,
} from '@typescript-auth/domains';
import { RoleRepository } from '../role';
import { verifyPassword } from '../../utils';

@EntityRepository(Robot)
export class RobotRepository extends Repository<Robot> {
    // ------------------------------------------------------------------

    async getOwnedPermissions(
        id: typeof Robot.prototype.id,
    ) : Promise<PermissionItem<unknown>[]> {
        let permissions : PermissionItem<unknown>[] = await this.getSelfOwnedPermissions(id);

        const roles = await this.manager
            .getRepository(RobotRole)
            .find({
                robot_id: id,
            });

        const roleIds: typeof Role.prototype.id[] = roles.map((userRole) => userRole.role_id);

        if (roleIds.length === 0) {
            return permissions;
        }

        const roleRepository = this.manager.getCustomRepository<RoleRepository>(RoleRepository);
        permissions = [...permissions, ...await roleRepository.getOwnedPermissions(roleIds)];

        return permissions;
    }

    async getSelfOwnedPermissions(id: string) : Promise<PermissionItem<unknown>[]> {
        const repository = this.manager.getRepository(RobotPermission);

        const entities = await repository.find({
            robot_id: id,
        });

        const result : PermissionItem<unknown>[] = [];
        for (let i = 0; i < entities.length; i++) {
            result.push({
                id: entities[i].permission_id,
                condition: entities[i].condition,
                power: entities[i].power,
                fields: entities[i].fields,
                negation: entities[i].negation,
            });
        }

        return result;
    }

    /**
     * Verify a client by id and secret.
     *
     * @param id
     * @param secret
     */
    async verifyCredentials(id: string, secret: string) : Promise<Robot | undefined> {
        const entity = await this.createQueryBuilder('client')
            .addSelect('client.secret')
            .where('client.id = :id', { id })
            .getOne();

        if (
            !entity ||
            !entity.secret
        ) {
            return undefined;
        }

        const verified = await verifyPassword(secret, entity.secret);
        if (!verified) {
            return undefined;
        }

        return entity;
    }
}
