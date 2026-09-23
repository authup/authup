/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event } from '@authup/core-kit';
import {
    and,
    defineQuery,
    gte,
    lt,
} from '@rapiq/core';
import type { DataSource } from 'typeorm';
import { Between, LessThan } from 'typeorm';
import { withDatabaseLock } from 'typeorm-extension';
import { EventAggregateEntity, EventEntity } from '../../../../../adapters/database/domains/index.ts';
import type { IEventAggregateRepository } from '../../../../../core/index.ts';
import { EVENT_AGGREGATE_DATABASE_LOCK } from '../../../../../core/index.ts';
import { DATABASE_LOCK_OPTIONS } from '../../constants.ts';
import { applyGroupedQuery } from '../query.ts';

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
                const rows = normalize(await qb.getRawMany());

                // the grouped read runs outside the transaction, so the
                // transaction never waits on a second pooled connection (#3526)
                await this.dataSource.transaction(async (manager) => {
                    await manager.delete(EventAggregateEntity, { day });
                    if (rows.length > 0) {
                        await manager.insert(EventAggregateEntity, rows.map((row) => ({
                            day,
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

    async findDays(from: string, to: string): Promise<string[]> {
        const repository = this.dataSource.getRepository(EventAggregateEntity);
        const column = repository.metadata.findColumnWithPropertyName('day')!;

        const rows = await repository.createQueryBuilder('aggregate')
            .select('aggregate.day', 'day')
            .distinct(true)
            .where({ day: Between(from, to) })
            .getRawMany<{ day: unknown }>();

        // hydrate the raw value the way an entity read would: mysql2 answers
        // a Date, the other drivers a string
        return rows.map((row) => this.dataSource.driver.prepareHydratedValue(row.day, column));
    }

    async findOldestEventDay(): Promise<string | null> {
        const [event] = await this.dataSource.getRepository(EventEntity).find({
            select: { id: true, createdAt: true },
            order: { createdAt: 'ASC' },
            take: 1,
        });

        return event ? event.createdAt.slice(0, 10) : null;
    }

    async deleteBefore(before: string): Promise<number> {
        const result = await this.dataSource.getRepository(EventAggregateEntity).delete({ day: LessThan(before) });

        return result.affected ?? 0;
    }
}
