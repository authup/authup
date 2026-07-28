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
} from 'vitest';
import { EventEntity } from '../../../../../src/adapters/database/domains/index.ts';
import { EventRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/index.ts';
import { createTestDatabaseApplication } from '../../../../app';

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
});
