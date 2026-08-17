/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Event } from '@authup/core-kit';
import { EventName, EventScope } from '@authup/core-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { EventEntity } from '../../../../../src/adapters/database/domains/index.ts';
import { EventRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/index.ts';
import { createTestDatabaseApplication } from '../../../../app';

// Force a non-UTC host timezone for THIS worker: the defect this spec pins
// (a bound Date serialized in host-local time against the DB-clock-stamped
// created_at) is invisible on a UTC host — and CI runs UTC. Etc/GMT-2 is
// UTC+2 (POSIX inverted sign), reproducing the positive-offset failure mode
// (window start lands in the future → count 0 → throttle never trips).
// Set before the suite connects so the mysql2/pg drivers serialize under it.
process.env.TZ = 'Etc/GMT-2';

const IP = '203.0.113.7';

describe('app/modules/database/repositories/event', () => {
    const suite = createTestDatabaseApplication();

    let repository : EventRepositoryAdapter;

    beforeAll(async () => {
        await suite.setup();

        repository = new EventRepositoryAdapter(
            suite.dataSource.getRepository<Event>(EventEntity),
        );
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const record = async (actorName: string) => {
        // created_at is deliberately left unset — it is stamped by the
        // DATABASE server's clock (the column DEFAULT), which is exactly the
        // value countRecent's window comparison must agree with. Stamping it
        // app-side here would hide a host-vs-database timezone mismatch.
        await repository.save(repository.create({
            id: randomUUID(),
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN_FAILED,
            actorName,
            requestIpAddress: IP,
            expiring: false,
        }));
    };

    const countByRef = async (refId: string) => suite.dataSource
        .getRepository<Event>(EventEntity)
        .countBy({ refId });

    it('counts a just-written row inside the window (host-timezone independent)', async () => {
        // the login-throttle window: the bound `since` must compare correctly
        // against the DB-clock-stamped created_at regardless of the HOST's
        // timezone. Pre-fix, a Date object bound on a non-UTC host shifted
        // the window by the UTC offset and the throttle never tripped on
        // postgres/mysql.
        const actorName = `throttle-probe-${randomUUID()}`;
        await record(actorName);
        await record(actorName);

        const count = await repository.countRecent({
            name: EventName.LOGIN_FAILED,
            actorName,
            requestIpAddress: IP,
            since: new Date(Date.now() - 60_000).toISOString(),
        });

        expect(count).toEqual(2);
    });

    it('excludes rows older than the window start', async () => {
        const actorName = `throttle-probe-${randomUUID()}`;
        await record(actorName);

        const count = await repository.countRecent({
            name: EventName.LOGIN_FAILED,
            actorName,
            requestIpAddress: IP,
            since: new Date(Date.now() + 60_000).toISOString(),
        });

        expect(count).toEqual(0);
    });

    describe('deleteExpired', () => {
        const recordExpiring = async (refId: string, expiresAt: string) => {
            await repository.save(repository.create({
                id: randomUUID(),
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                refId,
                expiring: true,
                expiresAt,
            }));
        };

        it('drains every expired row across several batches', async () => {
            // The sweep must never issue one unbounded DELETE: a first sweep
            // after a retention change can match millions of rows, and the
            // cleaner re-runs it every minute on every replica. Batching only
            // holds if the loop also DRAINS. A single bounded statement would
            // silently leave a permanent backlog behind.
            const refId = `sweep-batch-${randomUUID()}`;
            const past = new Date(Date.now() - 60_000).toISOString();
            for (let i = 0; i < 5; i++) {
                await recordExpiring(refId, past);
            }

            const deleted = await repository.deleteExpired(
                new Date().toISOString(),
                { batchSize: 2 },
            );

            expect(deleted).toEqual(5);
            expect(await countByRef(refId)).toEqual(0);
        });

        it('bounds each statement to the batch size', async () => {
            const refId = `sweep-bound-${randomUUID()}`;
            const past = new Date(Date.now() - 60_000).toISOString();
            for (let i = 0; i < 5; i++) {
                await recordExpiring(refId, past);
            }

            const ormRepository = suite.dataSource.getRepository<Event>(EventEntity);
            const adapter = new EventRepositoryAdapter(ormRepository);
            const spy = vi.spyOn(ormRepository, 'delete');

            await adapter.deleteExpired(new Date().toISOString(), { batchSize: 2 });

            // 5 rows at 2 per batch: three DELETEs, none wider than the batch.
            expect(spy).toHaveBeenCalledTimes(3);
            for (const call of spy.mock.calls) {
                const criteria = call[0] as { id: { _value: string[] } };
                expect(criteria.id._value.length).toBeLessThanOrEqual(2);
            }

            spy.mockRestore();
        });

        it('keeps rows that have not expired and rows that never expire', async () => {
            const refId = `sweep-keep-${randomUUID()}`;
            const future = new Date(Date.now() + 600_000).toISOString();

            await recordExpiring(refId, future);
            await repository.save(repository.create({
                id: randomUUID(),
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                refId,
                expiring: false,
            }));

            const deleted = await repository.deleteExpired(new Date().toISOString());

            expect(deleted).toEqual(0);
            expect(await countByRef(refId)).toEqual(2);
        });
    });
});
