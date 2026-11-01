/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy, Realm } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IPolicyRepository } from '../../../../../core/index.ts';
import { PolicyEntity, PolicyRepository, RealmEntity } from '../../../../../adapters/database/domains/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

/**
 * Well below the 65535 bound parameters postgres allows per statement.
 */
const DESCENDANT_CHUNK_SIZE = 500;

export type PolicyRepositoryAdapterContext = {
    repository: PolicyRepository,
    realmRepository: Repository<Realm>,
};

export type PolicyRepositoryAdapterOptions = {
    lockRows?: boolean,
};

export class PolicyRepositoryAdapter extends EntityRepositoryAdapter<Policy, PolicyRepository> implements IPolicyRepository {
    constructor(ctx: PolicyRepositoryAdapterContext, options: PolicyRepositoryAdapterOptions = {}) {
        super(ctx.repository, {
            alias: 'policy',
            target: PolicyEntity,
            entity: 'policy',
            // the per-row realm gate reads `realmId` (issue #3574)
            realmScope: {},
            realmRepository: new RealmRepositoryAdapter(ctx.realmRepository),
            lockRows: options.lockRows,
        });
    }

    protected override async extendOne(entity: Policy): Promise<void> {
        await this.repository.extendOneWithEA(entity);
    }

    protected override async extendMany(entities: Policy[]): Promise<void> {
        await this.repository.extendManyWithEA(entities);
    }

    async saveWithEA(entity: Policy, data?: Record<string, any>): Promise<Policy> {
        await this.persist(() => this.repository.saveOneWithEA(entity, data));
        await this.repository.updateClosureTable(entity, this.repository.manager);

        return entity;
    }

    /**
     * Walks parent_id, the column the delete cascade follows, so the set is
     * exactly what a delete of the entity removes. Locked rows under a
     * transaction() repository, which also blocks a child insert referencing
     * one of them until commit.
     */
    async findDescendants(entity: Policy): Promise<Policy[]> {
        const output: Policy[] = [];
        const seen = new Set<string>([entity.id]);

        let frontier = [entity.id];

        while (frontier.length > 0) {
            const next: string[] = [];

            for (let i = 0; i < frontier.length; i += DESCENDANT_CHUNK_SIZE) {
                const qb = this.repository.manager
                    .getRepository(PolicyEntity)
                    .createQueryBuilder('policy')
                    .where('policy.parentId IN (:...ids)', { ids: frontier.slice(i, i + DESCENDANT_CHUNK_SIZE) });

                if (this.options.lockRows) {
                    qb.setLock('pessimistic_write');
                }

                const children = (await qb.getMany()).filter((child) => !seen.has(child.id));

                for (const child of children) {
                    seen.add(child.id);
                    next.push(child.id);
                }

                output.push(...children);
            }

            frontier = next;
        }

        return output;
    }

    async deleteFromTree(entity: Policy): Promise<void> {
        const treeRepository = this.repository.manager.getTreeRepository(PolicyEntity);

        await treeRepository.remove(entity);
    }

    async transaction<R>(fn: (repository: IPolicyRepository) => Promise<R>): Promise<R> {
        const dataSource = this.repository.manager.connection;

        if (!isDatabaseTypeRowLockable(dataSource.options.type)) {
            // better-sqlite3: no FOR UPDATE, and the driver shares one query
            // runner, so a transaction here would nest inside whatever else
            // runs on it (the removeGuarded rule)
            return fn(this);
        }

        return dataSource.transaction((manager) => fn(new PolicyRepositoryAdapter({
            repository: new PolicyRepository(manager),
            realmRepository: manager.getRepository(RealmEntity),
        }, { lockRows: true })));
    }
}
