/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityRepository, In, Repository } from 'typeorm';
import {
    PermissionMeta,
    Role, User, UserRole,
    buildPermissionMetaFromRelation,
} from '@typescript-auth/domains';

import { compare } from '@typescript-auth/server-utils';
import { RoleRepository } from '../role';
import { UserRoleEntity } from '../user-role';
import { UserPermissionEntity } from '../user-permission';
import { UserEntity } from './entity';

@EntityRepository(UserEntity)
export class UserRepository extends Repository<UserEntity> {
    async syncRoles(
        userId: User['id'],
        roleIds: Role['id'][],
    ) {
        const userRoleRepository = this.manager.getRepository(UserRoleEntity);

        const userRoles = await userRoleRepository.createQueryBuilder('userRole')
            .where('userRole.user_id = :userId', { userId })
            .getMany();

        const userRoleIdsToDrop : UserRole['id'][] = userRoles
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

    async getOwnedPermissions(
        userId: User['id'],
    ) : Promise<PermissionMeta[]> {
        let permissions : PermissionMeta[] = await this.getSelfOwnedPermissions(userId);

        const roles = await this.manager
            .getRepository(UserRoleEntity)
            .find({
                user_id: userId,
            });

        const roleIds: Role['id'][] = roles.map((userRole) => userRole.role_id);

        if (roleIds.length === 0) {
            return permissions;
        }

        const roleRepository = this.manager.getCustomRepository<RoleRepository>(RoleRepository);
        permissions = [...permissions, ...await roleRepository.getOwnedPermissions(roleIds)];

        return permissions;
    }

    async getSelfOwnedPermissions(userId: string) : Promise<PermissionMeta[]> {
        const repository = this.manager.getRepository(UserPermissionEntity);

        const entities = await repository.find({
            user_id: userId,
        });

        const result : PermissionMeta[] = [];
        for (let i = 0; i < entities.length; i++) {
            result.push(buildPermissionMetaFromRelation(entities[i]));
        }

        return result;
    }

    // ------------------------------------------------------------------

    /**
     * Verify a user by name and password.
     *
     * @param name
     * @param password
     */
    async verifyCredentials(name: string, password: string) : Promise<UserEntity | undefined> {
        const entity = await this.createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.name LIKE :name', { name })
            .getOne();

        if (
            !entity ||
            !entity.password
        ) {
            return undefined;
        }

        const verified = await compare(password, entity.password);
        if (!verified) {
            return undefined;
        }

        return entity;
    }
}
