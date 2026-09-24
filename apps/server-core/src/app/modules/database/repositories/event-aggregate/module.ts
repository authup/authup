/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event } from '@authup/core-kit';
import { EntityType, EventScope } from '@authup/core-kit';
import {
    and,
    defineQuery,
    gte,
    lt,
} from '@rapiq/core';
import type { DataSource } from 'typeorm';
import {
    Between,
    In,
    LessThan,
    Not,
} from 'typeorm';
import { withDatabaseLock } from 'typeorm-extension';
import { EventAggregateEntity, EventEntity, RealmEntity } from '../../../../../adapters/database/domains/index.ts';
import type { IEventAggregateRepository } from '../../../../../core/index.ts';
import { EVENT_AGGREGATE_DATABASE_LOCK } from '../../../../../core/index.ts';
import { DATABASE_LOCK_OPTIONS } from '../../constants.ts';
import { applyGroupedQuery } from '../query.ts';

const EVENT_AGGREGATE_INSERT_CHUNK = 500;

export class EventAggregateRepositoryAdapter implements IEventAggregateRepository {
    private readonly dataSource: DataSource;

    private queue: Promise<unknown> = Promise.resolve();

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Recomputes of one adapter run one after another: the database lock
     * excludes other processes, but it is a passthrough on better-sqlite3,
     * whose single shared connection refuses a second transaction.
     */
    recompute(day: string): Promise<void> {
        const run = this.queue.then(() => this.recomputeLocked(day));
        this.queue = run.catch(() => undefined);

        return run;
    }

    protected async recomputeLocked(day: string): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        try {
            await withDatabaseLock(queryRunner, EVENT_AGGREGATE_DATABASE_LOCK, async () => {
                const next = new Date(`${day}T00:00:00.000Z`);
                next.setUTCDate(next.getUTCDate() + 1);

                const qb = this.dataSource.getRepository(EventEntity).createQueryBuilder('event');
                const { normalize } = applyGroupedQuery(qb, defineQuery<Event>({
                    filters: and(
                        gte('createdAt', `${day}T00:00:00.000Z`),
                        lt('createdAt', next.toISOString()),
                    ),
                    groups: ['realmId', 'scope', 'name', 'refType'],
                    aggregates: ['count'],
                }));
                let rows = normalize(await qb.getRawMany());

                // auth_events outlives its realms (no foreign key), the
                // rollups do not: a gone realm's events are dropped, except
                // the rows about the realm itself, which are the deployment's
                // history of realms and are kept as global
                const realmIds = [...new Set(rows.map((row) => row.realmId).filter(Boolean))] as string[];
                if (realmIds.length > 0) {
                    const realms = await this.dataSource.getRepository(RealmEntity).find({
                        select: { id: true },
                        where: { id: In(realmIds) },
                    });
                    const existing = new Set(realms.map((realm) => realm.id));

                    // several gone realms may then share a key: every
                    // reader sums the counts, so the rows need no merge
                    rows = rows.flatMap((row) => {
                        if (!row.realmId || existing.has(row.realmId as string)) {
                            return [row];
                        }

                        return row.refType === EntityType.REALM ? [{ ...row, realmId: null }] : [];
                    });
                }

                // written with the process clock: a day whose rollup was
                // written before the day ended is provisional (findDays)
                const createdAt = new Date().toISOString();

                // the grouped read runs outside the transaction, so the
                // transaction never waits on a second pooled connection (#3526)
                await this.dataSource.transaction(async (manager) => {
                    await manager.delete(EventAggregateEntity, { date: day });

                    // one statement binds at most 65535 values on postgres
                    // (32766 on sqlite), 7 per row, and insert() never chunks; sqlite
                    // also reloads the generated ids through one expression of
                    // at most 1000 terms
                    for (let i = 0; i < rows.length; i += EVENT_AGGREGATE_INSERT_CHUNK) {
                        await manager.insert(EventAggregateEntity, rows.slice(i, i + EVENT_AGGREGATE_INSERT_CHUNK).map((row) => ({
                            createdAt,
                            date: day,
                            realmId: row.realmId as string | null,
                            scope: row.scope as Event['scope'],
                            name: row.name as string,
                            refType: row.refType as string | null,
                            count: Number(row.count),
                        })));
                    }
                });
            }, DATABASE_LOCK_OPTIONS);
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * The days holding a final rollup, i.e. one written after the day
     * ended: a recompute of a day still open is provisional, and the
     * backfill repairs it once the day is over.
     */
    async findDays(from: string, to: string): Promise<string[]> {
        const repository = this.dataSource.getRepository(EventAggregateEntity);
        const dayColumn = repository.metadata.findColumnWithPropertyName('date')!;
        const createdAtColumn = repository.metadata.findColumnWithPropertyName('createdAt')!;

        const rows = await repository.createQueryBuilder('aggregate')
            .select('aggregate.date', 'date')
            .addSelect('MAX(aggregate.createdAt)', 'createdAt')
            .where({ date: Between(from, to) })
            .groupBy('aggregate.date')
            .getRawMany<{ date: unknown, createdAt: unknown }>();

        // hydrate the raw values the way an entity read would: mysql2
        // answers a Date, the other drivers a string
        return rows
            .map((row) => ({
                day: this.dataSource.driver.prepareHydratedValue(row.date, dayColumn) as string,
                createdAt: this.dataSource.driver.prepareHydratedValue(row.createdAt, createdAtColumn) as string,
            }))
            .filter((row) => {
                const end = new Date(`${row.day}T00:00:00.000Z`);
                end.setUTCDate(end.getUTCDate() + 1);

                return new Date(row.createdAt).getTime() >= end.getTime();
            })
            .map((row) => row.day);
    }

    async findOldestEventDay(): Promise<string | null> {
        const [event] = await this.dataSource.getRepository(EventEntity).find({
            select: { id: true, createdAt: true },
            order: { createdAt: 'ASC' },
            take: 1,
        });

        return event ? event.createdAt.slice(0, 10) : null;
    }

    async findCoverage(): Promise<{ aggregateFrom: string | null, entityAggregateFrom: string | null }> {
        const repository = this.dataSource.getRepository(EventAggregateEntity);
        const [other, entity] = await Promise.all([
            repository.findOne({
                select: { id: true, date: true }, 
                where: { scope: Not(EventScope.ENTITY) }, 
                order: { date: 'ASC' }, 
            }),
            repository.findOne({
                select: { id: true, date: true }, 
                where: { scope: EventScope.ENTITY }, 
                order: { date: 'ASC' }, 
            }),
        ]);

        return {
            aggregateFrom: other?.date ?? null,
            entityAggregateFrom: entity?.date ?? null,
        };
    }

    async deleteBefore(before: string): Promise<number> {
        const result = await this.dataSource.getRepository(EventAggregateEntity).delete({ date: LessThan(before) });

        return result.affected ?? 0;
    }
}
