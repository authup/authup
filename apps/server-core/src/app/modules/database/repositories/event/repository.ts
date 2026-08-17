/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { Repository } from 'typeorm';
import { In, LessThan } from 'typeorm';
import { applyQuery, redactFieldConditions } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    EventCountRecentFilter,
    EventDeleteExpiredOptions,
    EventFindManyOptions,
    IEventRepository,
} from '../../../../../core/index.ts';
import { EVENT_RETENTION_SWEEP_BATCH_SIZE } from '../../../../../core/index.ts';
import { applyRealmScopeSelect } from '../helpers.ts';

export class EventRepositoryAdapter implements IEventRepository {
    private readonly repository: Repository<Event>;

    constructor(repository: Repository<Event>) {
        this.repository = repository;
    }

    create(data: Partial<Event>): Event {
        return this.repository.create(data);
    }

    async save(entity: Event): Promise<Event> {
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
        // A non-positive or non-integral size must never reach `take`: typeorm
        // ignores a falsy one, which would silently restore the single
        // unbounded DELETE this batching exists to prevent, and the rest reach
        // the driver as invalid SQL. Fall back to the default instead.
        const requested = options.batchSize;
        const batchSize = typeof requested === 'number' &&
            Number.isSafeInteger(requested) &&
            requested > 0 ?
            requested :
            EVENT_RETENTION_SWEEP_BATCH_SIZE;

        let total = 0;

        for (;;) {
            const rows = await this.repository.find({
                select: { id: true },
                where: {
                    expiring: true,
                    expiresAt: LessThan(now),
                },
                take: batchSize,
            });

            if (rows.length === 0) {
                break;
            }

            const result = await this.repository.delete({ id: In(rows.map((row) => row.id)) });

            // A driver that does not report affected rows still made
            // progress, so count the batch rather than returning 0.
            total += result.affected ?? rows.length;

            // Another replica's sweep already owns these rows. Stop rather
            // than re-selecting them; the next tick picks up whatever is left.
            if (result.affected === 0) {
                break;
            }

            if (rows.length < batchSize) {
                break;
            }
        }

        return total;
    }
}
