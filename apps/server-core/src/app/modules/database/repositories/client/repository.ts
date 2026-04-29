/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Realm, Role } from '@authup/core-kit';
import type { PermissionPolicyBinding } from '@authup/access';
import { buildRedisKeyPath } from '@authup/server-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IClientRepository, IRealmRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import { translateWhereConditions } from '../helpers.ts';
import { loadBoundPermissions } from '../bindings.ts';
import {
    CachePrefix,
    ClientEntity,
    ClientPermissionEntity,
    ClientRoleEntity,
} from '../../../../../adapters/database/domains/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type ClientRepositoryAdapterContext = {
    repository: Repository<Client>,
    realmRepository: Repository<Realm>,
};

export class ClientRepositoryAdapter implements IClientRepository {
    private readonly repository: Repository<Client>;

    private readonly realmRepository: IRealmRepository;

    constructor(ctx: ClientRepositoryAdapterContext) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Client>> {
        const qb = this.repository.createQueryBuilder('client');
        qb.groupBy('client.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'client',
            fields: {
                default: [
                    'id',
                    'active',
                    'built_in',
                    'name',
                    'display_name',
                    'description',
                    'secret_hashed',
                    'secret_encrypted',
                    'base_url',
                    'root_url',
                    'redirect_uri',
                    'grant_types',
                    'scope',
                    'is_confidential',
                    'realm_id',
                    'updated_at',
                    'created_at',
                ],
                allowed: ['secret'],
            },
            filters: { allowed: ['id', 'name', 'realm_id', 'realm.name'] },
            pagination: { maxLimit: 50 },
            relations: {
                allowed: ['realm'],
                onJoin: (_property: string, key: string, q: any) => {
                    q.addGroupBy(`${key}.id`);
                },
            },
            sort: { allowed: ['id', 'created_at', 'updated_at'] },
        });

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    findOneById(id: string): Promise<Client | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string, realmKey?: string): Promise<Client | null> {
        const qb = this.repository.createQueryBuilder('client');
        qb.where('client.name = :name', { name });

        if (realmKey) {
            const realm = await this.realmRepository.resolve(realmKey);
            if (realm) {
                qb.andWhere('client.realm_id = :realmId', { realmId: realm.id });
            }
        }

        return qb.getOne();
    }

    async findOne(id: string, query?: Record<string, any>, realmKey?: string): Promise<Client | null> {
        const qb = this.repository.createQueryBuilder('client');

        if (isUUID(id)) {
            qb.where('client.id = :id', { id });
        } else {
            qb.where('client.name = :name', { name: id });

            if (realmKey) {
                const realm = await this.realmRepository.resolve(realmKey);
                if (!realm) {
                    return null;
                }
                qb.andWhere('client.realm_id = :realmId', { realmId: realm.id });
            }
        }

        applyQuery(qb, query || {}, {
            defaultAlias: 'client',
            fields: {
                default: [
                    'id',
                    'active',
                    'built_in',
                    'name',
                    'display_name',
                    'description',
                    'secret_hashed',
                    'secret_encrypted',
                    'base_url',
                    'root_url',
                    'redirect_uri',
                    'grant_types',
                    'scope',
                    'is_confidential',
                    'realm_id',
                    'updated_at',
                    'created_at',
                ],
                allowed: ['secret'],
            },
            relations: { allowed: ['realm'] },
        });

        return qb.getOne();
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Client | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findManyBy(where: Record<string, any>): Promise<Client[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<Client | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    async findOneWithSecret(where: Record<string, any>): Promise<Client | null> {
        const qb = this.repository.createQueryBuilder('client');

        Object.entries(where).forEach(([key, value]) => {
            qb.andWhere(`client.${key} = :${key}`, { [key]: value });
        });

        qb.addSelect('client.secret');

        return qb.getOne();
    }

    create(data: Partial<Client>): Client {
        return this.repository.create(data);
    }

    merge(entity: Client, data: Partial<Client>): Client {
        return this.repository.merge(entity, data);
    }

    async save(entity: Client): Promise<Client> {
        return this.repository.save(entity);
    }

    async remove(entity: Client): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<Client>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: ClientEntity,
        });
    }

    async checkUniqueness(data: Partial<Client>, existing?: Client): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: ClientEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }

    async getBoundRoles(entity: string | Client): Promise<Role[]> {
        const id = typeof entity === 'string' ? entity : entity.id;
        const entries = await this.repository.manager
            .getRepository(ClientRoleEntity)
            .find({
                where: { client_id: id },
                relations: { role: true },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.CLIENT_OWNED_ROLES,
                        key: id,
                    }),
                    milliseconds: 60_000,
                },
            });

        return entries.map((entry) => entry.role);
    }

    async getBoundPermissions(entity: string | Client): Promise<PermissionPolicyBinding[]> {
        const id = typeof entity === 'string' ? entity : entity.id;
        return loadBoundPermissions({
            manager: this.repository.manager,
            junctionTarget: ClientPermissionEntity,
            where: { client_id: id },
            cachePrefix: CachePrefix.CLIENT_OWNED_PERMISSIONS,
            cacheKey: id,
        });
    }
}
