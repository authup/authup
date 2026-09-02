/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Realm, Role } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { PermissionPolicyBinding } from '@authup/access';
import { buildRedisKeyPath } from '@authup/server-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery, redactFieldConditions } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IClientRepository, IRealmRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import { isEntityUnique, translateWhereConditions } from '../helpers.ts';
import { loadBoundPermissions } from '../bindings.ts';
import {
    CachePrefix,
    ClientEntity,
    ClientPermissionEntity,
    ClientRoleEntity,
    RealmEntity,
} from '../../../../../adapters/database/domains/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type ClientRepositoryAdapterContext = {
    repository: Repository<Client>,
    realmRepository: Repository<Realm>,
};

export type ClientRepositoryAdapterOptions = {
    lockRows?: boolean,
};

export class ClientRepositoryAdapter implements IClientRepository {
    private readonly repository: Repository<Client>;

    private readonly realmRepository: IRealmRepository;

    private readonly lockRows: boolean;

    constructor(ctx: ClientRepositoryAdapterContext, options: ClientRepositoryAdapterOptions = {}) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
        this.lockRows = options.lockRows ?? false;
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<Client>> {
        const qb = this.repository.createQueryBuilder('client');
        qb.groupBy('client.id');

        const { pagination } = applyQuery(qb, query);

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: redactFieldConditions(query, entities),
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
            const realmId = await this.realmRepository.resolveId(realmKey);
            if (!realmId) {
                return null;
            }
            qb.andWhere('client.realmId = :realmId', { realmId });
        }

        return qb.getOne();
    }

    async findOne(id: string, query?: IQuery, realmKey?: string): Promise<Client | null> {
        const qb = this.repository.createQueryBuilder('client');

        if (isUUID(id)) {
            qb.where('client.id = :id', { id });
        } else {
            qb.where('client.name = :name', { name: id });

            if (realmKey) {
                const realmId = await this.realmRepository.resolveId(realmKey);
                if (!realmId) {
                    return null;
                }
                qb.andWhere('client.realmId = :realmId', { realmId });
            }
        }

        applyQuery(qb, query);

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
        return this.repository.findOne({
            where: translateWhereConditions(where),
            ...(this.lockRows ? { lock: { mode: 'pessimistic_write' } } : {}),
        });
    }

    async findOneWithSecret(where: Record<string, any>): Promise<Client | null> {
        const qb = this.repository.createQueryBuilder('client');

        Object.entries(where).forEach(([key, value]) => {
            qb.andWhere(`client.${key} = :${key}`, { [key]: value });
        });

        qb.addSelect('client.secret');

        if (this.lockRows) {
            qb.setLock('pessimistic_write');
        }

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

    async transaction<R>(fn: (repository: IClientRepository) => Promise<R>): Promise<R> {
        const dataSource = this.repository.manager.connection;
        if (!isDatabaseTypeRowLockable(dataSource.options.type)) {
            // better-sqlite3: no FOR UPDATE, and the driver shares ONE query
            // runner, so a transaction here would nest as a savepoint inside
            // whatever else is running on it. Plain unlocked passthrough,
            // exactly as the un-guarded path did (the removeGuarded rule).
            return fn(this);
        }

        // mysql / postgres: real concurrency. Hand the callback an adapter
        // bound to the transaction's manager whose single-row reads lock,
        // so the row loaded by save() cannot change under the merge.
        return dataSource.transaction((manager) => fn(new ClientRepositoryAdapter({
            repository: manager.getRepository(ClientEntity),
            realmRepository: manager.getRepository(RealmEntity),
        }, { lockRows: true })));
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
                where: { clientId: id },
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
            where: { clientId: id },
            cachePrefix: CachePrefix.CLIENT_OWNED_PERMISSIONS,
            cacheKey: id,
        });
    }
}
