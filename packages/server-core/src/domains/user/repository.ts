/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DataSource,
    EntityManager,
} from 'typeorm';
import {
    In,
} from 'typeorm';
import type {
    Role,
    User,
} from '@authup/core-kit';
import {

    buildAbilityFromPermissionRelation,
} from '@authup/core-kit';
import type { Ability } from '@authup/kit';
import {
    createNanoID,
    isUUID,
} from '@authup/kit';
import { buildRedisKeyPath, compare, hash } from '@authup/server-kit';
import { CachePrefix } from '../constants';
import { ExtraAttributeRepository } from '../core';
import { RoleRepository } from '../role';
import { UserRoleEntity } from '../user-role';
import { UserPermissionEntity } from '../user-permission';
import { UserEntity } from './entity';
import { UserAttributeEntity } from '../user-attribute';

export class UserRepository extends ExtraAttributeRepository<UserEntity, UserAttributeEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(instance, {
            attributeExtraProperties: async (input) => {
                const output : Partial<UserAttributeEntity> = {};
                output.user_id = input.id;
                output.realm_id = input.realm_id;

                return output;
            },
            entity: UserEntity,
            entityPrimaryColumn: 'id',
            attributeEntity: UserAttributeEntity,
            attributeForeignColumn: 'user_id',
            cachePrefix: CachePrefix.USER_OWNED_ATTRIBUTES,
        });
    }

    async syncPermissions(
        userId: User['id'],
        permissionIds: Role['id'][],
    ) {
        const repository = this.manager.getRepository(UserPermissionEntity);

        const entities = await repository.createQueryBuilder('userPermission')
            .where('userPermission.user_id = :userId', { userId })
            .getMany();

        const idsToDrop = entities
            .filter((userRole) => permissionIds.indexOf(userRole.permission_id) === -1)
            .map((entity) => entity.id);

        if (idsToDrop.length > 0) {
            await repository.delete({
                id: In(idsToDrop),
            });
        }

        const toAdd = permissionIds
            .filter((roleId) => entities.findIndex((userRole) => userRole.permission_id === roleId) === -1)
            .map((roleId) => repository.create({ permission_id: roleId, user_id: userId }));

        if (toAdd.length > 0) {
            await repository.insert(toAdd);
        }
    }

    async syncRoles(
        userId: User['id'],
        roleIds: string[],
    ) {
        const repository = this.manager.getRepository(UserRoleEntity);

        const entities = await repository.createQueryBuilder('userRole')
            .where('userRole.user_id = :userId', { userId })
            .getMany();

        const idsToDrop = entities
            .filter((userRole) => roleIds.indexOf(userRole.role_id) === -1)
            .map((userRole) => userRole.id);

        if (idsToDrop.length > 0) {
            await repository.delete({
                id: In(idsToDrop),
            });
        }

        const toAdd = roleIds
            .filter((roleId) => entities.findIndex((userRole) => userRole.role_id === roleId) === -1)
            .map((roleId) => repository.create({ role_id: roleId, user_id: userId }));

        if (toAdd.length > 0) {
            await repository.insert(toAdd);
        }
    }

    // ------------------------------------------------------------------

    async getOwnedPermissions(
        id: User['id'],
    ) : Promise<Ability[]> {
        const permissions = await this.getSelfOwnedPermissions(id);

        const roles = await this.manager
            .getRepository(UserRoleEntity)
            .find({
                where: {
                    user_id: id,
                },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.USER_OWNED_ROLES,
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

    async getSelfOwnedPermissions(id: string) : Promise<Ability[]> {
        const repository = this.manager.getRepository(UserPermissionEntity);

        const entities = await repository.find({
            where: {
                user_id: id,
            },
            relations: {
                policy: true,
                permission: {
                    policy: true,
                },
            },
            cache: {
                id: buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    id,
                }),
                milliseconds: 60.000,
            },
        });

        return entities.map((entity) => buildAbilityFromPermissionRelation(entity));
    }

    // ------------------------------------------------------------------

    /**
     * Verify a user by id/name and password.
     *
     * @param idOrName
     * @param password
     * @param realmId
     */
    async verifyCredentials(
        idOrName: string,
        password: string,
        realmId?: string,
    ) : Promise<UserEntity | undefined> {
        const query = this.createQueryBuilder('user')
            .leftJoinAndSelect('user.realm', 'realm');

        if (isUUID(idOrName)) {
            query.where('user.id = :id', { id: idOrName });
        } else {
            query.where('user.name LIKE :name', { name: idOrName });

            if (realmId) {
                query.andWhere('user.realm_id = :realmId', { realmId });
            }
        }

        const entities = await query
            .addSelect('user.password')
            .getMany();

        for (let i = 0; i < entities.length; i++) {
            if (!entities[i].password) {
                continue;
            }

            const verified = await this.verifyPassword(password, entities[i].password);
            if (verified) {
                return entities[i];
            }
        }

        return undefined;
    }

    async createWithPassword(data: Partial<User>) : Promise<{
        entity: UserEntity,
        password: string
    }> {
        const entity = this.create(data);

        const password = entity.password || createNanoID(64);
        entity.password = await this.hashPassword(password);

        return {
            entity,
            password,
        };
    }

    async hashPassword(password: string) : Promise<string> {
        return hash(password);
    }

    async verifyPassword(password: string, passwordHashed: string) : Promise<boolean> {
        return compare(password, passwordHashed);
    }

    protected async getExtraAttributesProperties(input: UserEntity): Promise<Partial<UserAttributeEntity>> {
        return {
            user_id: input.id,
            realm_id: input.realm_id,
        };
    }
}
