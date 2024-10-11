/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission, Role, User } from '@authup/core-kit';
import { createNanoID, isUUID } from '@authup/kit';
import { buildRedisKeyPath, compare, hash } from '@authup/server-kit';
import type { DataSource, EntityManager } from 'typeorm';
import { In } from 'typeorm';
import { CachePrefix } from '../constants';
import { EARepository } from '../core';
import { UserAttributeEntity } from '../user-attribute';
import { UserPermissionEntity } from '../user-permission';
import { UserRoleEntity } from '../user-role';
import { UserRelationItemSyncOperation } from './constants';
import { UserEntity } from './entity';
import type { UserRelationSyncItem, UserRelationSyncOptions } from './types';

export class UserRepository extends EARepository<UserEntity, UserAttributeEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(instance, {
            attributeProperties: (input, parent) => {
                input.user_id = parent.id;
                input.realm_id = parent.realm_id;

                return input;
            },
            entity: UserEntity,
            entityPrimaryColumn: 'id',
            attributeEntity: UserAttributeEntity,
            attributeForeignColumn: 'user_id',
            cachePrefix: CachePrefix.USER_OWNED_ATTRIBUTES,
        });
    }

    async syncPermissions(options: UserRelationSyncOptions) {
        const items = options.items.map((id) => {
            if (typeof id === 'string') {
                return {
                    id,
                } satisfies UserRelationSyncItem;
            }

            return id;
        });

        const repository = this.manager.getRepository(UserPermissionEntity);
        const entities = await repository.findBy({
            user_id: options.id,
        });

        const idsToDrop = entities
            .filter((entity) => {
                const index = items.findIndex((o) => o.id === entity.permission_id);
                if (index === -1) {
                    return true;
                }

                if (items[index].operation === UserRelationItemSyncOperation.DELETE) {
                    items.splice(index, 1);
                    return true;
                }

                return false;
            })
            .map((entity) => entity.id);

        if (idsToDrop.length > 0) {
            await repository.delete({
                id: In(idsToDrop),
            });
        }

        const toAdd = items
            .filter((o) => {
                const index = entities.findIndex((userRole) => userRole.permission_id === o.id);
                if (index !== -1) {
                    return false;
                }

                return o.operation !== UserRelationItemSyncOperation.NONE &&
                    o.operation !== UserRelationItemSyncOperation.DELETE;
            })
            .map((o) => repository.create({
                permission_id: o.id,
                permission_realm_id: o.realmId,
                user_id: options.id,
                user_realm_id: options.realmId,
            }));

        if (toAdd.length > 0) {
            await repository.insert(toAdd);
        }
    }

    async syncRoles(options: UserRelationSyncOptions) {
        const items = options.items.map(
            (id) => {
                if (typeof id === 'string') {
                    return {
                        id,
                    } satisfies UserRelationSyncItem;
                }

                return id;
            },
        );

        const repository = this.manager.getRepository(UserRoleEntity);

        const entities = await repository.findBy({
            user_id: options.id,
        });

        const idsToDrop = entities
            .filter((entity) => {
                const index = items.findIndex((o) => o.id === entity.role_id);
                if (index === -1) {
                    return true;
                }

                if (items[index].operation === UserRelationItemSyncOperation.DELETE) {
                    items.splice(index, 1);
                    return true;
                }

                return false;
            })
            .map((entity) => entity.id);

        if (idsToDrop.length > 0) {
            await repository.delete({
                id: In(idsToDrop),
            });
        }

        const toAdd = items
            .filter((o) => {
                const index = entities.findIndex((userRole) => userRole.role_id === o.id);
                if (index !== -1) {
                    return false;
                }

                return o.operation !== UserRelationItemSyncOperation.NONE &&
                    o.operation !== UserRelationItemSyncOperation.DELETE;
            })
            .map((o) => repository.create({
                role_id: o.id,
                role_realm_id: o.realmId,
                user_id: options.id,
                user_realm_id: options.realmId,
            }));

        if (toAdd.length > 0) {
            await repository.insert(toAdd);
        }
    }

    // ------------------------------------------------------------------

    async getBoundRoles(entity: string | User) : Promise<Role[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const items = await this.manager
            .getRepository(UserRoleEntity)
            .find({
                where: {
                    user_id: id,
                },
                relations: {
                    role: true,
                },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.USER_OWNED_ROLES,
                        key: id,
                    }),
                    milliseconds: 60_000,
                },
            });

        return items.map((relation) => relation.role);
    }

    async getBoundPermissions(
        entity: string | User,
    ) : Promise<Permission[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const repository = this.manager.getRepository(UserPermissionEntity);

        const entities = await repository.find({
            where: {
                user_id: id,
            },
            relations: {
                permission: true,
            },
            cache: {
                id: buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    key: id,
                }),
                milliseconds: 60_000,
            },
        });

        return entities.map((relation) => relation.permission);
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
}
