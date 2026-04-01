/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { User, UserPermission, UserRole } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import type { IUserIdentityRepository, IdentityProviderMapperElement } from '../../../../core/index.ts';
import { IdentityProviderMapperOperation } from '../../../../core/index.ts';
import type { UserRepository } from '../../../../adapters/database/domains/index.ts';
import { CachePrefix } from '../../../../adapters/database/domains/index.ts';

export type UserIdentityRepositoryContext = {
    repository: UserRepository,
    userPermissionRepository: Repository<UserPermission>,
    userRoleRepository: Repository<UserRole>,
};

export class UserIdentityRepository implements IUserIdentityRepository {
    private readonly repository: UserRepository;

    private readonly userPermissionRepository: Repository<UserPermission>;

    private readonly userRoleRepository: Repository<UserRole>;

    constructor(ctx: UserIdentityRepositoryContext) {
        this.repository = ctx.repository;
        this.userPermissionRepository = ctx.userPermissionRepository;
        this.userRoleRepository = ctx.userRoleRepository;
    }

    async findOneById(id: string): Promise<User | null> {
        return this.find(id);
    }

    async findOneByName(id: string, realm?: string): Promise<User | null> {
        return this.find(id, realm);
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<User | null> {
        return this.find(idOrName, realm);
    }

    async findOneBy(where: Record<string, any>): Promise<User | null> {
        return this.repository.findOneBy(where);
    }

    private async find(key: string, realmKey?: string) : Promise<User | null> {
        const query = this.repository.createQueryBuilder('user')
            .leftJoinAndSelect('user.realm', 'realm');

        const isId = isUUID(key);
        if (isId) {
            query.where('user.id = :id', { id: key });
        } else {
            query.where('user.name = :name', { name: key });

            if (realmKey) {
                if (isUUID(realmKey)) {
                    query.andWhere('user.realm_id = :realmId', { realmId: realmKey });
                } else {
                    query.andWhere('realm.name = :realmName', { realmName: realmKey });
                }
            }
        }

        const { columns } = this.repository.metadata;
        for (const column of columns) {
            if (!column.isSelect) {
                query.addSelect(`user.${column.databaseName}`);
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
            return this.repository.extendOneWithEA(entity);
        }

        return null;
    }

    async saveOneWithEA(user: Partial<User>, extraAttributes: Record<string, any>): Promise<User> {
        const entity = this.repository.create(user);
        return this.repository.saveOneWithEA(entity, extraAttributes);
    }

    async savePermissions(user: User, items: IdentityProviderMapperElement[]): Promise<void> {
        const { userPermissionRepository: repository } = this;

        const ids = items.map((item) => item.value);

        const idsToDelete = items
            .filter((item) => item.operation === IdentityProviderMapperOperation.DELETE)
            .map((item) => item.value);

        const entities = await repository.findBy({
            user_id: user.id,
            permission_id: In(ids),
        });

        const entitiesToDelete : UserPermission[] = [];
        for (const entity of entities) {
            const index = idsToDelete.indexOf(entity.permission_id);
            if (index === -1) {
                continue;
            }

            entitiesToDelete.push(entity);
        }

        if (entitiesToDelete.length > 0) {
            await repository.remove(entitiesToDelete);
        }

        const entitiesToCreate : UserPermission[] = [];
        for (const item of items) {
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
        const { userRoleRepository: repository } = this;

        const ids = items.map((item) => item.value);

        const idsToDelete = items
            .filter((item) => item.operation === IdentityProviderMapperOperation.DELETE)
            .map((item) => item.value);

        const entities = await repository.findBy({
            user_id: user.id,
            role_id: In(ids),
        });

        const entitiesToDelete : UserRole[] = [];
        for (const entity of entities) {
            const index = idsToDelete.indexOf(entity.role_id);
            if (index === -1) {
                continue;
            }

            entitiesToDelete.push(entity);
        }

        if (entitiesToDelete.length > 0) {
            await repository.remove(entitiesToDelete);
        }

        const entitiesToCreate : UserRole[] = [];
        for (const item of items) {
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
