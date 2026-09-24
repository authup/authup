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
import type { Repository } from 'typeorm';
import type { IClientRepository } from '../../../../../core/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import { loadBoundPermissions } from '../bindings.ts';
import {
    CachePrefix,
    ClientEntity,
    ClientPermissionEntity,
    ClientRoleEntity,
    RealmEntity,
} from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type ClientRepositoryAdapterContext = {
    repository: Repository<Client>,
    realmRepository: Repository<Realm>,
};

export type ClientRepositoryAdapterOptions = {
    lockRows?: boolean,
};

/**
 * No `realmScope`: the list is not gated per row, the secret is gated by the
 * client schema's field condition instead (issue #3322).
 */
export class ClientRepositoryAdapter extends EntityRepositoryAdapter<Client> implements IClientRepository {
    constructor(ctx: ClientRepositoryAdapterContext, options: ClientRepositoryAdapterOptions = {}) {
        super(ctx.repository, {
            alias: 'client',
            target: ClientEntity,
            entity: 'client',
            realmRepository: new RealmRepositoryAdapter(ctx.realmRepository),
            lockRows: options.lockRows,
        });
    }

    async findOne(id: string, query?: IQuery, realmKey?: string): Promise<Client | null> {
        return this.findOneWithQuery(id, query, realmKey);
    }




    async findOneWithSecret(where: Record<string, any>): Promise<Client | null> {
        const qb = this.repository.createQueryBuilder('client');

        Object.entries(where).forEach(([key, value]) => {
            qb.andWhere(`client.${key} = :${key}`, { [key]: value });
        });

        qb.addSelect('client.secret');

        if (this.options.lockRows) {
            qb.setLock('pessimistic_write');
        }

        return qb.getOne();
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
