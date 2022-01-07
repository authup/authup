/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityRepository, In, Repository } from 'typeorm';
import { PermissionItem } from '@typescript-auth/core';

import {
    Role, User, UserPermission, UserRole,
} from '@typescript-auth/common';
import { RoleRepository } from '../role';
import { verifyPassword } from '../../security';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
    async syncRoles(userId: number, roleIds: typeof Role.prototype.id[]) {
        const userRoleRepository = this.manager.getRepository(UserRole);

        const userRoles = await userRoleRepository.createQueryBuilder('userRole')
            .where('userRole.user_id = :userId', { userId })
            .getMany();

        const userRoleIdsToDrop : number[] = userRoles
            .filter((userRole: UserRole) => roleIds.indexOf(userRole.role_id) === -1)
            .map((userRole: UserRole) => userRole.id);

        if (userRoleIdsToDrop.length > 0) {
            await userRoleRepository.delete({
                id: In(userRoleIdsToDrop),
            });
        }

        const userRolesToAdd : Partial<UserRole>[] = roleIds
            .filter((roleId) => userRoles.findIndex((userRole: UserRole) => userRole.role_id === roleId) === -1)
            .map((roleId) => userRoleRepository.create({ role_id: roleId, user_id: userId }));

        if (userRolesToAdd.length > 0) {
            await userRoleRepository.insert(userRolesToAdd);
        }
    }

    // ------------------------------------------------------------------

    async getOwnedPermissions(userId: number) : Promise<PermissionItem<unknown>[]> {
        let permissions : PermissionItem<unknown>[] = await this.getSelfOwnedPermissions(userId);

        const roles = await this.manager
            .getRepository(UserRole)
            .find({
                user_id: userId,
            });

        const roleIds: number[] = roles.map((userRole) => userRole.role_id);

        if (roleIds.length === 0) {
            return permissions;
        }

        const roleRepository = this.manager.getCustomRepository<RoleRepository>(RoleRepository);
        permissions = [...permissions, ...await roleRepository.getOwnedPermissions(roleIds)];

        return permissions;
    }

    async getSelfOwnedPermissions(userId: number) : Promise<PermissionItem<unknown>[]> {
        const repository = this.manager.getRepository(UserPermission);

        const entities = await repository.find({
            user_id: userId,
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

    // ------------------------------------------------------------------

    /**
     * Find a user by name and password.
     *
     * @param name
     * @param password
     */
    async verifyCredentials(name: string, password: string) : Promise<User | undefined> {
        let user : User | undefined;

        try {
            user = await this.createQueryBuilder('user')
                .addSelect('user.password')
                .where('user.name LIKE :name', { name })
                .getOne();

            if (typeof user === 'undefined') {
                return undefined;
            }
        } catch (e) {
            return undefined;
        }

        if (!user.password) {
            return undefined;
        }

        const verified = await verifyPassword(password, user.password);
        if (!verified) {
            return undefined;
        }

        return user;
    }
}
