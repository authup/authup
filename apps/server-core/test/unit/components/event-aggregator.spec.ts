/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { EntityType, EventName, EventScope } from '@authup/core-kit';
import { Container } from 'eldin';
import type { IContainer } from 'eldin';
import cron from 'node-cron';
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
import { createEventAggregatorComponent, createEventAggregatorTick } from '../../../src/components/index.ts';
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
        scope?: string,
        refType?: string | null,
    } = {}) {
        await dataSource.getRepository(EventEntity).insert({
            id: randomUUID(),
            scope: (input.scope ?? EventScope.OAUTH2) as `${EventScope}`,
            name: (input.name ?? EventName.LOGIN) as `${EventName}`,
            realmId: input.realmId === undefined ? realmId : input.realmId,
            refType: input.refType ?? null,
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

    it('should never start a tick while the previous one still runs', async () => {
        const schedule = vi.spyOn(cron, 'schedule');
        const component = createEventAggregatorComponent(dataSource, { retentionDays: 0 });
        try {
            await component.start();

            expect(schedule).toHaveBeenCalledWith('* * * * *', expect.any(Function), expect.objectContaining({ noOverlap: true }));
        } finally {
            await component.stop();
            schedule.mockRestore();
        }
    });

    it('should write a day holding more groups than one statement can bind', async () => {
        // 7 bound values per rollup row: past postgres' 65535 and sqlite's
        // 32766 parameters in one statement
        const groups = 10_000;
        const events = Array.from({ length: groups }, (_, index) => ({
            id: randomUUID(),
            scope: EventScope.ENTITY,
            name: 'created' as `${EventName}`,
            refType: `type-${index}`,
            realmId,
            expiring: false,
            createdAt: new Date(`${TODAY}T01:00:00.000Z`) as unknown as string,
        }));
        for (let i = 0; i < events.length; i += 500) {
            await dataSource.getRepository(EventEntity).insert(events.slice(i, i + 500));
        }

        await repository.recompute(TODAY);

        expect(await dataSource.getRepository(EventAggregateEntity).count({ where: { day: TODAY } })).toEqual(groups);
    }, HOOK_TIMEOUT);

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

    it('should recompute a day holding events of a deleted realm', async () => {
        await seed(`${TODAY}T01:00:00.000Z`);
        await seed(`${TODAY}T02:00:00.000Z`, { realmId: null });

        await dataSource.getRepository(RealmEntity).delete({ id: realmId });
        await repository.recompute(TODAY);

        expect(await read(TODAY)).toEqual([
            {
                realmId: null,
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
                refType: null,
                count: 1,
            },
        ]);
    });

    it('should keep the realm history of a deleted realm as global', async () => {
        const live = await dataSource.getRepository(RealmEntity).save({ name: `realm-${randomUUID().slice(0, 8)}` });

        await seed(`${TODAY}T01:00:00.000Z`, {
            scope: EventScope.ENTITY, 
            name: 'created', 
            refType: EntityType.REALM, 
        });
        await seed(`${TODAY}T02:00:00.000Z`, {
            scope: EventScope.ENTITY, 
            name: 'deleted', 
            refType: EntityType.REALM, 
        });
        await seed(`${TODAY}T01:00:00.000Z`, {
            scope: EventScope.ENTITY, 
            name: 'created', 
            refType: EntityType.USER, 
        });
        await seed(`${TODAY}T01:00:00.000Z`, {
            realmId: live.id, 
            scope: EventScope.ENTITY, 
            name: 'created', 
            refType: EntityType.REALM,
        });

        await dataSource.getRepository(RealmEntity).delete({ id: realmId });
        await repository.recompute(TODAY);

        expect(await read(TODAY)).toEqual([
            {
                realmId: live.id,
                scope: EventScope.ENTITY,
                name: 'created',
                refType: EntityType.REALM,
                count: 1,
            },
            {
                realmId: null,
                scope: EventScope.ENTITY,
                name: 'created',
                refType: EntityType.REALM,
                count: 1,
            },
            {
                realmId: null,
                scope: EventScope.ENTITY,
                name: 'deleted',
                refType: EntityType.REALM,
                count: 1,
            },
        ].sort((a, b) => `${a.realmId}${a.name}`.localeCompare(`${b.realmId}${b.name}`)));
    });

    it('should restore a deleted realm on the days the tick recomputes, and only there', async () => {
        const older = shift(TODAY, -3);
        const realmRow = {
            scope: EventScope.ENTITY, 
            name: 'created', 
            refType: EntityType.REALM, 
        };

        await seed(`${older}T01:00:00.000Z`, realmRow);
        await seed(`${older}T02:00:00.000Z`, { realmId: null });
        await seed(`${TODAY}T01:00:00.000Z`, { ...realmRow, name: 'deleted' });

        const tick = createEventAggregatorTick(repository, { retentionDays: 0 });
        await tick();
        expect(await read(older)).toHaveLength(2);

        // the cascade takes every rollup row of the realm, on every day
        await dataSource.getRepository(RealmEntity).delete({ id: realmId });
        await tick();

        expect(await read(TODAY)).toEqual([{
            ...realmRow, 
            name: 'deleted', 
            realmId: null, 
            count: 1, 
        }]);
        // an older day still holding other rows reads as final and is
        // never recomputed: the realm's row of that day stays gone
        expect(await read(older)).toEqual([
            {
                realmId: null,
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
                refType: null,
                count: 1,
            },
        ]);
    });

    it('should repair a day last recomputed before it ended', async () => {
        await seed(`${TODAY}T01:00:00.000Z`);
        await repository.recompute(TODAY);

        // the aggregator is away for all of the next day
        await seed(`${TODAY}T15:00:00.000Z`);
        vi.setSystemTime(new Date(`${shift(TODAY, 2)}T12:00:00.000Z`));

        await createEventAggregatorTick(repository, { retentionDays: 0 })();

        expect((await read(TODAY))[0].count).toEqual(2);
    });

    it('should drop the rollups of a deleted realm', async () => {
        await seed(`${TODAY}T01:00:00.000Z`);
        await repository.recompute(TODAY);
        expect(await read(TODAY)).toHaveLength(1);

        await dataSource.getRepository(RealmEntity).delete({ id: realmId });

        expect(await read(TODAY)).toEqual([]);
    });
});
