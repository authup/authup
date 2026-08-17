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
import { EVENT_RETENTION_SWEEP_BATCH_SIZE } from '../../../../../src/core/index.ts';
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
            const findSpy = vi.spyOn(ormRepository, 'find');
            const deleteSpy = vi.spyOn(ormRepository, 'delete');

            await adapter.deleteExpired(new Date().toISOString(), { batchSize: 2 });

            // 5 rows at 2 per batch: three DELETEs rather than one sweeping
            // statement. Each is fed by a select bounded to the batch size,
            // which is what keeps the DELETE itself bounded.
            expect(deleteSpy).toHaveBeenCalledTimes(3);
            // asserted so the bound check below can never pass vacuously
            expect(findSpy).toHaveBeenCalledTimes(3);
            for (const [options] of findSpy.mock.calls) {
                expect(options?.take).toEqual(2);
            }

            findSpy.mockRestore();
            deleteSpy.mockRestore();
        });

        it.each([0, -1, 2.5, Number.POSITIVE_INFINITY, Number.NaN])(
            'falls back to the default batch size for an unusable batchSize (%s)',
            async (batchSize) => {
                // A batchSize of 0 is the one that matters: typeorm ignores a
                // falsy take, so the sweep would silently revert to the single
                // unbounded DELETE this batching exists to prevent. The rest
                // would reach the driver as invalid SQL. Neither is reachable
                // today, but the option sits on a port, so pin the fallback.
                const refId = `sweep-guard-${randomUUID()}`;
                await recordExpiring(refId, new Date(Date.now() - 60_000).toISOString());

                const ormRepository = suite.dataSource.getRepository<Event>(EventEntity);
                const adapter = new EventRepositoryAdapter(ormRepository);
                const findSpy = vi.spyOn(ormRepository, 'find');

                await adapter.deleteExpired(new Date().toISOString(), { batchSize });

                expect(findSpy).toHaveBeenCalled();
                for (const [options] of findSpy.mock.calls) {
                    expect(options?.take).toEqual(EVENT_RETENTION_SWEEP_BATCH_SIZE);
                }

                findSpy.mockRestore();
            },
        );

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

            await repository.deleteExpired(new Date().toISOString());

            // scoped to this test's own rows: the sweep is table-wide, so a
            // global deleted-count assertion would couple this to whatever
            // other specs happen to leave behind.
            expect(await countByRef(refId)).toEqual(2);
        });
    });
});
