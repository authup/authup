/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { Repository } from 'typeorm';
import { EntityManager, LessThan } from 'typeorm';
import { applyQuery, redactFieldConditions } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    EventCountRecentFilter,
    EventDeleteExpiredOptions,
    EventFindManyOptions,
    EventSaveOptions,
    IEventRepository,
} from '../../../../../core/index.ts';
import { EVENT_RETENTION_SWEEP_BATCH_SIZE } from '../../../../../core/index.ts';
import { applyRealmScopeSelect, deleteInBatches, resolveSweepBatchSize } from '../helpers.ts';

export class EventRepositoryAdapter implements IEventRepository {
    private readonly repository: Repository<Event>;

    constructor(repository: Repository<Event>) {
        this.repository = repository;
    }

    create(data: Partial<Event>): Event {
        return this.repository.create(data);
    }

    async save(entity: Event, options: EventSaveOptions = {}): Promise<Event> {
        // An audit row written from inside a persist transaction rides it:
        // the connection behind the write is still held while the subscriber
        // hooks run, so a save through the DataSource would wait for a second
        // pooled connection and ten concurrent writes deadlock (#3539).
        // Deliberately no savepoint around it: savepoints are a stack per
        // connection and typeorm reads its depth before the awaited SAVEPOINT
        // statement, while the after-hooks of one array save (an entity's
        // attribute rows) run concurrently on one runner, so the depth races
        // and a RELEASE names a savepoint that does not exist. The residual is
        // postgres-only: it aborts the whole transaction on a failed statement,
        // so an INSERT that fails on the database's side (this row has no
        // foreign key, its free-text columns are truncated and its uuid columns
        // only receive ids the server minted, so nothing data-shaped fails it)
        // dooms the write, and the executor's COMMIT then answers ROLLBACK
        // without raising.
        if (options.transaction instanceof EntityManager) {
            return options.transaction.withRepository(this.repository).save(entity);
        }

        return this.repository.save(entity);
    }

    async findOneById(id: string): Promise<Event | null> {
        return this.repository.findOneBy({ id });
    }

    async findMany(
        query: IQuery,
        options: EventFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Event>> {
        const qb = this.repository.createQueryBuilder('event');

        const { pagination } = applyQuery(qb, query);

        applyRealmScopeSelect(qb, 'event', ['actorId', 'actorType']);

        if (options.owner) {
            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('event.actorId = :ownerActorId AND event.actorType = :ownerActorType', {
                ownerActorId: options.owner.actorId,
                ownerActorType: options.owner.actorType,
            });
        }

        if (options.realmId) {
            qb.andWhere('event.realmId = :routeRealmId', { routeRealmId: options.realmId });
        }

        if (options.visibility) {
            const constraints: string[] = [];
            const parameters: Record<string, unknown> = {};
            const realmIds = options.visibility.realmIds
                .filter((realmId): realmId is string => realmId !== null);

            if (realmIds.length > 0) {
                constraints.push('event.realmId IN (:...visibleRealmIds)');
                parameters.visibleRealmIds = realmIds;
            }
            if (options.visibility.realmIds.includes(null)) {
                constraints.push('event.realmId IS NULL');
            }
            if (options.visibility.owner) {
                constraints.push('(event.actorId = :visibleActorId AND event.actorType = :visibleActorType)');
                parameters.visibleActorId = options.visibility.owner.actorId;
                parameters.visibleActorType = options.visibility.owner.actorType;
            }

            qb.andWhere(`(${constraints.length > 0 ? constraints.join(' OR ') : '1 = 0'})`, parameters);
        }

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: redactFieldConditions(query, entities),
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async countRecent(filter: EventCountRecentFilter): Promise<number> {
        // created_at is stamped by the DATABASE server's clock (assumed UTC —
        // the shipped compose files and deployment posture; a non-UTC DB
        // server shifts the window regardless of what we bind), while a bound
        // Date object is serialized by the pg/mysql drivers in the HOST's
        // local timezone — on a non-UTC host that shifts the window by the
        // UTC offset (postgres: `timestamp without time zone` discards the
        // offset marker entirely). Bind a UTC wall-clock literal instead:
        // pg/mysql cast it as a wall-clock timestamp, sqlite compares it
        // lexicographically against the same format `datetime('now')` stores.
        const since = new Date(filter.since).toISOString().replace('T', ' ').replace('Z', '');

        const qb = this.repository.createQueryBuilder('event')
            .where('event.name = :name', { name: filter.name })
            .andWhere('event.createdAt > :since', { since });

        if (filter.actorName) {
            qb.andWhere('event.actorName = :actorName', { actorName: filter.actorName });
        }

        if (filter.requestIpAddress) {
            qb.andWhere('event.requestIpAddress = :requestIpAddress', { requestIpAddress: filter.requestIpAddress });
        }

        if (typeof filter.realmId !== 'undefined') {
            if (filter.realmId === null) {
                qb.andWhere('event.realmId IS NULL');
            } else {
                qb.andWhere('event.realmId = :realmId', { realmId: filter.realmId });
            }
        }

        return qb.getCount();
    }

    async deleteExpired(now: string, options: EventDeleteExpiredOptions = {}): Promise<number> {
        return deleteInBatches(
            this.repository,
            {
                expiring: true,
                expiresAt: LessThan(now),
            },
            resolveSweepBatchSize(options.batchSize, EVENT_RETENTION_SWEEP_BATCH_SIZE),
        );
    }
}
