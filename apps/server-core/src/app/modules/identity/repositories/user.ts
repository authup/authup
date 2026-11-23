/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { User, UserPermission, UserRole } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { buildCollectionTag, buildRecordTag } from '@rapiq/cache';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import type { IRealmRepository, IUserIdentityRepository, IdentityProviderMapperElement } from '../../../../core/index.ts';
import { IdentityProviderMapperOperation } from '../../../../core/index.ts';
import type { UserEntity, UserRepository } from '../../../../adapters/database/domains/index.ts';
import type { IQueryCache } from '../../database/index.ts';
import { buildIdentityQuery, findIdentityByName } from './helpers.ts';

export type UserIdentityRepositoryContext = {
    repository: UserRepository,
    userPermissionRepository: Repository<UserPermission>,
    userRoleRepository: Repository<UserRole>,
    cache: IQueryCache,
    realmRepository: Pick<IRealmRepository, 'resolveId'>,
};

export class UserIdentityRepository implements IUserIdentityRepository {
    private readonly repository: UserRepository;

    private readonly userPermissionRepository: Repository<UserPermission>;

    private readonly userRoleRepository: Repository<UserRole>;

    private readonly cache: IQueryCache;

    private readonly realmRepository: Pick<IRealmRepository, 'resolveId'>;

    constructor(ctx: UserIdentityRepositoryContext) {
        this.repository = ctx.repository;
        this.userPermissionRepository = ctx.userPermissionRepository;
        this.userRoleRepository = ctx.userRoleRepository;
        this.cache = ctx.cache;
        this.realmRepository = ctx.realmRepository;
    }

    async findOneById(id: string): Promise<User | null> {
        return isUUID(id) ? this.findById(id) : null;
    }

    async findOneByName(name: string, realm?: string): Promise<User | null> {
        return this.findByName(name, realm);
    }

    /**
     * A uuid-shaped key is tried as an id first and, on a miss, as a name:
     * a name may be shaped like a uuid. An id match wins.
     */
    async findOneByIdOrName(idOrName: string, realm?: string): Promise<User | null> {
        if (isUUID(idOrName)) {
            const entity = await this.findById(idOrName);

            if (entity) {
                return entity;
            }
        }

        return this.findByName(idOrName, realm);
    }

    async findOneBy(where: Record<string, any>): Promise<User | null> {
        return this.repository.findOneBy(where);
    }

    private async findById(id: string) : Promise<User | null> {
        // A uuid compares case-insensitively on the server dialects, so it is
        // canonicalized here: one cache key serves every spelling.
        const key = id.toLowerCase();
        const query = this.buildQuery().where('user.id = :id', { id: key });

        // the path unwind updates users by criteria, which bumps the collection tag alone
        const entity = await this.cache.remember(
            `identity/user/${key}`,
            (value) => [
                buildCollectionTag(EntityType.USER),
                ...(value ? [buildRecordTag(EntityType.REALM, value.realmId)] : []),
            ],
            () => query.getOne(),
            { manager: this.repository.manager },
        );

        return entity ? this.repository.extendOneWithEA(entity) : null;
    }

    private async findByName(name: string, realmKey?: string) : Promise<User | null> {
        const entity = await findIdentityByName({
            repository: this.repository,
            alias: 'user',
            realmRepository: this.realmRepository,
        }, name, realmKey);

        return entity ? this.repository.extendOneWithEA(entity) : null;
    }

    private buildQuery() {
        return buildIdentityQuery(this.repository, 'user');
    }

    async saveOneWithEA(user: Partial<User>, extraAttributes: Record<string, any>): Promise<User> {
        const entity = this.repository.create(user);

        return this.repository.saveOneWithEA(entity, extraAttributes);
    }

    async remove(user: User): Promise<void> {
        await this.repository.remove(user as UserEntity);
    }

    async savePermissions(user: User, items: IdentityProviderMapperElement[]): Promise<void> {
        const { userPermissionRepository: repository } = this;

        const ids = items.map((item) => item.value);

        const idsToDelete = items
            .filter((item) => item.operation === IdentityProviderMapperOperation.DELETE)
            .map((item) => item.value);

        const entities = await repository.findBy({
            userId: user.id,
            permissionId: In(ids),
        });

        const entitiesToDelete : UserPermission[] = [];

        for (const entity of entities) {
            const index = idsToDelete.indexOf(entity.permissionId);

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
                (entity) => entity.permissionId === item.value,
            );

            if (index !== -1) {
                continue;
            }

            const entity = repository.create({
                userId: user.id,
                userRealmId: user.realmId,
                permissionId: item.value as string,
                permissionRealmId: item.realmId as string,
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
            userId: user.id,
            roleId: In(ids),
        });

        const entitiesToDelete : UserRole[] = [];

        for (const entity of entities) {
            const index = idsToDelete.indexOf(entity.roleId);

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

            const index = entities.findIndex((entity) => entity.roleId === item.value);

            if (index !== -1) {
                continue;
            }

            const entity = repository.create({
                userId: user.id,
                userRealmId: user.realmId,
                roleId: item.value as string,
                roleRealmId: item.realmId as string,
            });

            entitiesToCreate.push(entity);
        }

        if (entitiesToCreate.length > 0) {
            await repository.save(entitiesToCreate);
        }
    }
}
