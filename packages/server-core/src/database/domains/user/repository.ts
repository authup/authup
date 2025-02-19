/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission, Role, User } from '@authup/core-kit';
import { createNanoID, isUUID } from '@authup/kit';
import { buildRedisKeyPath, compare, hash } from '@authup/server-kit';
import type {
    DataSource, EntityManager, FindOptionsWhere,
} from 'typeorm';
import { In } from 'typeorm';
import type { EntityTarget } from 'typeorm/common/EntityTarget';
import { CachePrefix } from '../constants';
import { EARepository } from '../../extra-attribute-repository';
import { UserAttributeEntity } from '../user-attribute';
import { UserPermissionEntity } from '../user-permission';
import { UserRoleEntity } from '../user-role';
import { UserRelationItemSyncOperation } from './constants';
import { UserEntity } from './entity';
import type { UserRelationSaveContext } from './types';

type UserRelationType = {
    user_id: string,
    user_realm_id: string | null,
    [key: string]: any
};
type UserRelationSyncContext<T> = {
    entity: EntityTarget<T>,
    idKey: keyof T,
    realmIdKey: keyof T
} & UserRelationSaveContext;

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

    async savePermissions(ctx: UserRelationSaveContext) {
        return this.saveRelationItems({
            ...ctx,
            entity: UserPermissionEntity,
            idKey: 'permission_id',
            realmIdKey: 'permission_realm_id',
        });
    }

    async saveRoles(ctx: UserRelationSaveContext) {
        return this.saveRelationItems({
            ...ctx,
            entity: UserRoleEntity,
            idKey: 'role_id',
            realmIdKey: 'role_realm_id',
        });
    }

    protected async saveRelationItems<T extends UserRelationType>(
        ctx: UserRelationSyncContext<T>,
    ) {
        const itemMap : Record<string, {
            operation: `${UserRelationItemSyncOperation}`,
            realmId?: string | null
        }> = {};

        for (let i = 0; i < ctx.items.length; i++) {
            const item = ctx.items[i];

            if (typeof item === 'string') {
                itemMap[item] = {
                    operation: UserRelationItemSyncOperation.NONE,
                };
            } else {
                itemMap[item.id] = {
                    realmId: item.realmId,
                    operation: item.operation,
                };
            }
        }

        const repository = this.manager.getRepository(ctx.entity);
        const where : FindOptionsWhere<T> = {
            user_id: ctx.id as T[keyof T],
            [ctx.idKey as keyof T]: In(Object.keys(itemMap)) as T[keyof T],
        };
        const entities = await repository.findBy(where);

        const entitiesToDelete = entities
            .filter(
                (entity) => !!itemMap[entity[ctx.idKey]] &&
                    itemMap[entity[ctx.idKey]].operation === UserRelationItemSyncOperation.DELETE,
            );

        if (entitiesToDelete.length > 0) {
            await repository.remove(entitiesToDelete);
        }

        const entitiesToAdd : T[] = [];

        const keys = Object.keys(itemMap);
        for (let i = 0; i < keys.length; i++) {
            const entityIndex = entities.findIndex((entity) => entity[ctx.idKey] === keys[i]);
            if (entityIndex !== -1) {
                continue;
            }

            if (
                itemMap[keys[i]].operation === UserRelationItemSyncOperation.NONE ||
                itemMap[keys[i]].operation === UserRelationItemSyncOperation.DELETE
            ) {
                continue;
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            entitiesToAdd.push(repository.create({
                [ctx.idKey]: keys[i],
                [ctx.realmIdKey]: itemMap[keys[i]].realmId,
                user_id: ctx.id as T[keyof T],
                user_realm_id: ctx.realmId as T[keyof T],
            }));
        }

        if (entitiesToAdd.length > 0) {
            await repository.insert(entitiesToAdd);
        }
    }

    // ------------------------------------------------------------------

    async getBoundRoles(
        entity: string | User,
        clientId?: string | null,
    ) : Promise<Role[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const where : FindOptionsWhere<UserRoleEntity> = {
            user_id: id,
        };

        if (clientId) {
            where.role = {
                client_id: clientId,
            };
        }

        const items = await this.manager
            .getRepository(UserRoleEntity)
            .find({
                where,
                relations: {
                    role: true,
                },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.USER_OWNED_ROLES,
                        key: id + (clientId ? `:${clientId}` : ''),
                    }),
                    milliseconds: 60_000,
                },
            });

        return items.map((relation) => relation.role);
    }

    async getBoundPermissions(
        entity: string | User,
        clientId?: string | null,
    ) : Promise<Permission[]> {
        let id : string;
        if (typeof entity === 'string') {
            id = entity;
        } else {
            id = entity.id;
        }

        const repository = this.manager.getRepository(UserPermissionEntity);

        const where : FindOptionsWhere<UserPermissionEntity> = {
            user_id: id,
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
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    key: id + (clientId ? `:${clientId}` : ''),
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
