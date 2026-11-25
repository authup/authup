/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event } from '@authup/core-kit';
import { EventName, EventScope } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { buildUUIDv7LowerBound } from '@authup/kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app/index.ts';
import {
    createFakeRealm,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../utils/index.ts';

const ADMIN_AUTHORIZATION = `Basic ${Buffer.from('admin:start123').toBase64()}`;
const SETTLE_WAIT = 1100;
const TIMEOUT = 15_000;

function wait(ms: number) {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

describe('src/http/controllers/entities/event (feed)', () => {
    const suite = createTestApplication({
        config: (c) => {
            c.eventLogFeedSettleSeconds = 1;
        },
    });

    let start: string;

    beforeAll(async () => {
        await suite.setup();

        start = buildUUIDv7LowerBound(Date.now() - 1000);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function readFeed(query: string, path = '/events/@feed'): Promise<Event[]> {
        const response = await httpRequest(suite, 'GET', `${path}?${query}`, { headers: { Authorization: ADMIN_AUTHORIZATION } });

        expect(response.status).toEqual(200);

        const body = await response.json() as { data: Event[] };

        return body.data;
    }

    function findCreated(rows: Event[], refId: string) {
        return rows.find((row) => row.refId === refId && row.name === EventName.CREATED);
    }

    it('returns entity changes after the cursor in id order', async () => {
        const { data: a } = await suite.client.user.create(createFakeUser());
        const { data: b } = await suite.client.user.create(createFakeUser());

        await wait(SETTLE_WAIT);

        const rows = await readFeed(`filter[id]=>${start}&filter[refType]=user&page[limit]=100`);

        const rowA = findCreated(rows, a.id);
        const rowB = findCreated(rows, b.id);

        expect(rowA).toBeDefined();
        expect(rowB).toBeDefined();
        expect(rows.indexOf(rowA!)).toBeLessThan(rows.indexOf(rowB!));

        for (let i = 1; i < rows.length; i++) {
            expect(rows[i].id > rows[i - 1].id).toBe(true);
        }

        const after = await readFeed(`filter[id]=>${rowA!.id}&filter[refType]=user&page[limit]=100`);

        expect(findCreated(after, b.id)).toBeDefined();
        expect(findCreated(after, a.id)).toBeUndefined();
    }, TIMEOUT);

    it('withholds changes younger than the settle window', async () => {
        const { data: c } = await suite.client.user.create(createFakeUser());

        const before = await readFeed(`filter[id]=>${start}&filter[refId]=${c.id}`);

        expect(findCreated(before, c.id)).toBeUndefined();

        await wait(SETTLE_WAIT);

        const after = await readFeed(`filter[id]=>${start}&filter[refId]=${c.id}`);

        expect(findCreated(after, c.id)).toBeDefined();
    }, TIMEOUT);

    it('ignores a caller\'s scope, sort and id bounds', async () => {
        // a login row, so that a scope=login filter has something to leak
        const user = createFakeUser();

        await suite.client.user.create(user);
        await suite.client.token.createWithPassword({ username: user.name, password: user.password! });

        await wait(SETTLE_WAIT);

        const scoped = await readFeed(`filter[id]=>${start}&filter[scope]=${EventScope.OAUTH2}&page[limit]=100`);

        expect(scoped.every((row) => row.scope === EventScope.ENTITY)).toBe(true);

        const sorted = await readFeed(`filter[id]=>${start}&sort=-id&page[limit]=100`);

        expect(sorted.length).toBeGreaterThanOrEqual(2);
        expect(sorted.every((row) => row.scope === EventScope.ENTITY)).toBe(true);

        for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].id > sorted[i - 1].id).toBe(true);
        }

        const { data: fresh } = await suite.client.user.create(createFakeUser());

        // a lower bound, not createUUIDv7: the generator is shared with the
        // server in this process and stays monotonic past a future mint
        const bounded = await readFeed(`filter[id]=<${buildUUIDv7LowerBound(Date.now() + 60_000)}&filter[refId]=${fresh.id}`);

        expect(findCreated(bounded, fresh.id)).toBeUndefined();
    }, TIMEOUT);

    it('does not repeat the cursor row', async () => {
        await wait(SETTLE_WAIT);

        const seen = new Set<string>();
        let cursor = start;
        let last: Event[] = [];

        for (let i = 0; i < 50; i++) {
            last = await readFeed(`filter[id]=>${cursor}&page[limit]=50`);

            if (last.length === 0) {
                break;
            }

            for (const row of last) {
                expect(seen.has(row.id)).toBe(false);
                expect(row.id > cursor).toBe(true);
                seen.add(row.id);
            }

            cursor = last[last.length - 1].id;
        }

        expect(seen.size).toBeGreaterThan(0);
        expect(last).toHaveLength(0);
    }, TIMEOUT);

    it('limits the realm mount to its realm', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const { data: user } = await suite.client.user.create(createFakeUser({ realmId: realm.id }));

        await wait(SETTLE_WAIT);

        const path = `/realms/${realm.id}/events/@feed`;

        const rows = await readFeed(`filter[id]=>${start}&page[limit]=100`, path);

        expect(rows.length).toBeGreaterThanOrEqual(1);
        expect(rows.every((row) => row.realmId === realm.id)).toBe(true);

        const own = await readFeed(`filter[id]=>${start}&filter[refId]=${user.id}`, path);

        expect(findCreated(own, user.id)).toBeDefined();

        const foreign = await readFeed(`filter[id]=>${start}&filter[refId]=${realm.id}`, path);

        expect(foreign.every((row) => row.realmId === realm.id)).toBe(true);
    }, TIMEOUT);

    it('refuses an actor without EVENT_READ', async () => {
        const user = createFakeUser();

        await suite.client.user.create(user);

        const token = await suite.client.token.createWithPassword({ username: user.name, password: user.password! });

        const client = new HTTPClient({ baseURL: suite.baseURL });

        client.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

        const { data: own } = await client.event.getMany();

        expect(own.length).toBeGreaterThanOrEqual(1);

        await expectClientError(() => client.get('events/@feed'), { status: 403 });
    });
});
