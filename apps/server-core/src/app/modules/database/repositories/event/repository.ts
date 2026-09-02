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

    /**
     * One pending audit save per caller connection, keyed by the manager the
     * hook handed over (every hook of one broadcast gets the same object).
     */
    private readonly transactionQueue: WeakMap<EntityManager, Promise<unknown>>;

    constructor(repository: Repository<Event>) {
        this.repository = repository;
        this.transactionQueue = new WeakMap();
    }

    create(data: Partial<Event>): Event {
        return this.repository.create(data);
    }

    async save(entity: Event, options: EventSaveOptions = {}): Promise<Event> {
        // An audit row written from inside a persist transaction rides it: the
        // connection behind the write is still held while the subscriber hooks
        // run, so a save through the DataSource would wait for a second pooled
        // connection and ten concurrent writes deadlock (#3539).
        if (options.transaction instanceof EntityManager) {
            return this.saveOnCallerConnection(options.transaction, entity);
        }

        return this.repository.save(entity);
    }

    /**
     * Writes the row on the connection the caller already holds.
     *
     * Serialized per connection, because the after-hooks of one array save run
     * concurrently (typeorm awaits them with Promise.all) and would otherwise
     * put several statements in flight on one client. pg deprecates that in
     * 8.22 and removes it in 9, and typeorm avoids it everywhere it controls
     * the fan-out.
     *
     * `transaction: false` keeps the nested save from opening a transaction of
     * its own. Inside a persist transaction it would not have, but a
     * query-builder insert (the extra-attribute add path) broadcasts its hooks
     * on a runner carrying no transaction, and there each save would otherwise
     * BEGIN and COMMIT one.
     *
     * Deliberately no savepoint: savepoints are a stack per connection, and
     * `startTransaction` issues `SAVEPOINT typeorm_<depth>` and awaits it
     * before incrementing the depth, so concurrent hooks raced it and a
     * RELEASE named a savepoint that was never created. The residual is
     * postgres-only and stated in .agents/architecture.md.
     */
    private saveOnCallerConnection(manager: EntityManager, entity: Event): Promise<Event> {
        const pending = this.transactionQueue.get(manager) || Promise.resolve();
        const next = pending
            .catch(() => undefined)
            .then(() => manager
                .withRepository(this.repository)
                .save(entity, { transaction: false }));

        // the queue tail must never stay rejected, or it would fail every
        // later row on this connection
        this.transactionQueue.set(manager, next.catch(() => undefined));

        return next;
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
