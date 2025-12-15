/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { In } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import type { IUserIdentityRepository, IdentityProviderMapperElement } from '../../../../core';
import { IdentityProviderMapperOperation } from '../../../../core';
import {
    CachePrefix,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../../adapters/database/domains';

export class UserIdentityRepository implements IUserIdentityRepository {
    async findOneById(id: string): Promise<User | null> {
        return this.find(id);
    }

    async findOneByName(id: string, realm?: string): Promise<User | null> {
        return this.find(id, realm);
    }

    private async find(key: string, realmKey?: string) : Promise<User | null> {
        const dataSource = await useDataSource();
        const repository = new UserRepository(dataSource);
        const query = repository.createQueryBuilder('user')
            .leftJoinAndSelect('user.realm', 'realm');

        const isId = isUUID(key);
        if (isId) {
            query.where('user.id = :id', { id: key });
        } else {
            query.where('user.name = :name', { name: key });

            if (realmKey) {
                if (isUUID(realmKey)) {
                    query.andWhere('user.realm_id = :realmId', {
                        realmId: realmKey,
                    });
                } else {
                    query.andWhere('realm.name = :realmName', {
                        realmName: realmKey,
                    });
                }
            }
        }

        const { columns } = repository.metadata;
        for (let i = 0; i < columns.length; i++) {
            if (!columns[i].isSelect) {
                query.addSelect(`user.${columns[i].databaseName}`);
            }
        }

        if (isId) {
            query.cache(
                buildRedisKeyPath({
                    prefix: CachePrefix.USER,
                    key,
                }),
                60_000,
            );
        }

        const entity = await query.getOne();
        if (entity) {
            return repository.extendOneWithEA(entity);
        }

        return null;
    }

    async saveOneWithEA(user: Partial<User>, extraAttributes: Record<string, any>): Promise<User> {
        const dataSource = await useDataSource();
        const repository = new UserRepository(dataSource);

        const entity = repository.create(user);
        return repository.saveOneWithEA(entity, extraAttributes);
    }

    async savePermissions(user: User, items: IdentityProviderMapperElement[]): Promise<void> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(UserPermissionEntity);

        const ids = items.map((item) => item.value);

        const idsToDelete = items
            .filter((item) => item.operation === IdentityProviderMapperOperation.DELETE)
            .map((item) => item.value);

        const entities = await repository.findBy({
            user_id: user.id,
            permission_id: In(ids),
        });

        const entitiesToDelete : UserPermissionEntity[] = [];
        for (let i = 0; i < entities.length; i++) {
            const index = idsToDelete.indexOf(entities[i].permission_id);
            if (index === -1) {
                continue;
            }

            entitiesToDelete.push(entities[i]);
        }

        if (entitiesToDelete.length > 0) {
            await repository.remove(entitiesToDelete);
        }

        const entitiesToCreate : UserPermissionEntity[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.operation !== IdentityProviderMapperOperation.CREATE) {
                continue;
            }

            const index = entities.findIndex(
                (entity) => entity.permission_id === item.value,
            );
            if (index !== -1) {
                continue;
            }

            const entity = repository.create({
                user_id: user.id,
                user_realm_id: user.realm_id,
                permission_id: item.value as string,
                permission_realm_id: item.realmId as string,
            });

            entitiesToCreate.push(entity);
        }

        if (entitiesToCreate.length > 0) {
            await repository.save(entitiesToCreate);
        }
    }

    async saveRoles(user: User, items: IdentityProviderMapperElement[]): Promise<void> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(UserRoleEntity);

        const ids = items.map((item) => item.value);

        const idsToDelete = items
            .filter((item) => item.operation === IdentityProviderMapperOperation.DELETE)
            .map((item) => item.value);

        const entities = await repository.findBy({
            user_id: user.id,
            role_id: In(ids),
        });

        const entitiesToDelete : UserRoleEntity[] = [];
        for (let i = 0; i < entities.length; i++) {
            const index = idsToDelete.indexOf(entities[i].role_id);
            if (index === -1) {
                continue;
            }

            entitiesToDelete.push(entities[i]);
        }

        if (entitiesToDelete.length > 0) {
            await repository.remove(entitiesToDelete);
        }

        const entitiesToCreate : UserRoleEntity[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.operation !== IdentityProviderMapperOperation.CREATE) {
                continue;
            }

            const index = entities.findIndex((entity) => entity.role_id === item.value);
            if (index !== -1) {
                continue;
            }

            const entity = repository.create({
                user_id: user.id,
                user_realm_id: user.realm_id,
                role_id: item.value as string,
                role_realm_id: item.realmId as string,
            });

            entitiesToCreate.push(entity);
        }

        if (entitiesToCreate.length > 0) {
            await repository.save(entitiesToCreate);
        }
    }
}
