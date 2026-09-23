/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { EventName, EventScope } from '@authup/core-kit';
import { Container } from 'eldin';
import type { IContainer } from 'eldin';
import type { DataSource } from 'typeorm';
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import {
    CacheModule,
    ConfigModule,
    LoggerModule,
} from '../../../src/index.ts';
import {
    EventAggregateEntity,
    EventEntity,
    RealmEntity,
} from '../../../src/adapters/database/domains/index.ts';
import { DatabaseInjectionKey } from '../../../src/app/modules/database/index.ts';
import { EventAggregateRepositoryAdapter } from '../../../src/app/modules/database/repositories/index.ts';
import { createEventAggregatorTick } from '../../../src/components/index.ts';
import { createTestDatabaseModuleForSecondaryInstance } from '../../app/index.ts';

// A schema synchronize before the first assertion runs.
const HOOK_TIMEOUT = 120_000;

const TODAY = '2026-06-15';

function shift(day: string, days: number) {
    const date = new Date(`${day}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

// An empty database of its own: the backfill walks to the oldest raw event,
// which rows other specs leave behind in the suite database would move.
describe('components/event-aggregator', () => {
    const database = createTestDatabaseModuleForSecondaryInstance('event-aggregate');

    let di : IContainer;
    let dataSource : DataSource;
    let repository : EventAggregateRepositoryAdapter;
    let realmId : string;

    beforeAll(async () => {
        di = new Container();

        await new ConfigModule().setup(di);
        await new LoggerModule().setup(di);
        await new CacheModule().setup(di);
        await database.setup(di);

        dataSource = di.resolve(DatabaseInjectionKey.DataSource);
        repository = new EventAggregateRepositoryAdapter(dataSource);
    }, HOOK_TIMEOUT);

    afterAll(async () => {
        await database.teardown(di);
    });

    beforeEach(async () => {
        await dataSource.getRepository(EventAggregateEntity).createQueryBuilder().delete().execute();
        await dataSource.getRepository(EventEntity).createQueryBuilder().delete().execute();

        const realm = await dataSource.getRepository(RealmEntity).save({ name: `realm-${randomUUID().slice(0, 8)}` });
        realmId = realm.id;

        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(`${TODAY}T12:00:00.000Z`));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    async function seed(at: string, input: {
        realmId?: string | null, 
        name?: string, 
        scope?: string 
    } = {}) {
        await dataSource.getRepository(EventEntity).insert({
            id: randomUUID(),
            scope: (input.scope ?? EventScope.OAUTH2) as `${EventScope}`,
            name: (input.name ?? EventName.LOGIN) as `${EventName}`,
            realmId: input.realmId === undefined ? realmId : input.realmId,
            expiring: false,
            createdAt: new Date(at) as unknown as string,
        });
    }

    async function read(day: string) {
        const rows = await dataSource.getRepository(EventAggregateEntity).find({ where: { day } });
        return rows
            .map((row) => ({
                realmId: row.realmId,
                scope: row.scope,
                name: row.name,
                refType: row.refType,
                count: Number(row.count),
            }))
            .sort((a, b) => `${a.realmId}${a.name}`.localeCompare(`${b.realmId}${b.name}`));
    }

    it('should replace a day with its grouped counts', async () => {
        await seed(`${TODAY}T01:00:00.000Z`);
        await seed(`${TODAY}T02:00:00.000Z`);
        await seed(`${TODAY}T03:00:00.000Z`, { name: EventName.LOGIN_FAILED });
        await seed(`${TODAY}T04:00:00.000Z`, { realmId: null });
        // the neighbouring days stay out
        await seed(`${shift(TODAY, -1)}T23:59:59.000Z`);
        await seed(`${shift(TODAY, 1)}T00:00:00.000Z`);

        await repository.recompute(TODAY);

        expect(await read(TODAY)).toEqual([
            {
                realmId,
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
                refType: null,
                count: 2,
            },
            {
                realmId,
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN_FAILED,
                refType: null,
                count: 1,
            },
            {
                realmId: null,
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
                refType: null,
                count: 1,
            },
        ].sort((a, b) => `${a.realmId}${a.name}`.localeCompare(`${b.realmId}${b.name}`)));
    });

    it('should leave the counts of one recompute after repeated and concurrent ones', async () => {
        await seed(`${TODAY}T01:00:00.000Z`);
        await seed(`${TODAY}T02:00:00.000Z`);

        await repository.recompute(TODAY);
        await repository.recompute(TODAY);
        await Promise.all([
            repository.recompute(TODAY),
            repository.recompute(TODAY),
        ]);

        expect(await read(TODAY)).toEqual([
            {
                realmId,
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
                refType: null,
                count: 2,
            },
        ]);
    });

    // two adapters stand in for two replicas: only the database lock keeps
    // them apart, and better-sqlite3 has none (one file per container)
    it.skipIf(!['mysql', 'postgres'].includes(process.env.DB_TYPE ?? ''))('should not double a day recomputed by two replicas at once', async () => {
        await seed(`${TODAY}T01:00:00.000Z`);
        await seed(`${TODAY}T02:00:00.000Z`);

        const replicas = Array.from({ length: 8 }, () => new EventAggregateRepositoryAdapter(dataSource));
        await Promise.all(replicas.map((replica) => replica.recompute(TODAY)));

        expect(await read(TODAY)).toEqual([
            {
                realmId,
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
                refType: null,
                count: 2,
            },
        ]);
    });

    it('should pick up a late write into yesterday', async () => {
        const yesterday = shift(TODAY, -1);
        await seed(`${yesterday}T10:00:00.000Z`);

        const tick = createEventAggregatorTick(repository, { retentionDays: 0 });
        await tick();
        expect((await read(yesterday))[0].count).toEqual(1);

        await seed(`${yesterday}T11:00:00.000Z`);
        await tick();
        expect((await read(yesterday))[0].count).toEqual(2);
    });

    it('should backfill toward the oldest raw event, seven days per tick', async () => {
        const oldest = shift(TODAY, -20);
        await seed(`${oldest}T10:00:00.000Z`);

        const tick = createEventAggregatorTick(repository, { retentionDays: 0 });
        const recompute = vi.spyOn(repository, 'recompute');

        await tick();
        expect(recompute.mock.calls.map(([day]) => day)).toEqual([
            TODAY,
            shift(TODAY, -1),
            ...Array.from({ length: 7 }, (_, i) => shift(TODAY, -2 - i)),
        ]);

        recompute.mockClear();
        await tick();
        expect(recompute.mock.calls.map(([day]) => day)).toEqual([
            TODAY,
            shift(TODAY, -1),
            ...Array.from({ length: 7 }, (_, i) => shift(TODAY, -9 - i)),
        ]);
        expect(await read(oldest)).toEqual([]);

        recompute.mockClear();
        await tick();
        expect(recompute.mock.calls.map(([day]) => day)).toEqual([
            TODAY,
            shift(TODAY, -1),
            ...Array.from({ length: 5 }, (_, i) => shift(TODAY, -16 - i)),
        ]);
        expect(await read(oldest)).toHaveLength(1);

        recompute.mockRestore();
    });

    it('should prune rollups past their retention, and keep them without one', async () => {
        const old = shift(TODAY, -40);
        await dataSource.getRepository(EventAggregateEntity).save({
            day: old,
            realmId,
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN,
            refType: null,
            count: 1,
        });

        await createEventAggregatorTick(repository, { retentionDays: 0 })();
        expect(await read(old)).toHaveLength(1);

        await createEventAggregatorTick(repository, { retentionDays: 30 })();
        expect(await read(old)).toEqual([]);
    });

    it('should drop the rollups of a deleted realm', async () => {
        await seed(`${TODAY}T01:00:00.000Z`);
        await repository.recompute(TODAY);
        expect(await read(TODAY)).toHaveLength(1);

        await dataSource.getRepository(RealmEntity).delete({ id: realmId });

        expect(await read(TODAY)).toEqual([]);
    });
});
