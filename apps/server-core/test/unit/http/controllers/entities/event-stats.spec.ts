/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventName } from '@authup/core-kit';
import type { EventStatsBucket } from '@authup/core-http-kit';
import { Client as HTTPClient, StatsGranularity } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import {
    createFakeRealm,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../utils';

const DAY_BUCKET = /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/;
const HOUR_BUCKET = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/;

function countOf(data: EventStatsBucket[], name: `${EventName}`): number {
    return data
        .filter((row) => row.name === name)
        .reduce((sum, row) => sum + row.count, 0);
}

describe('src/http/controllers/entities/event (stats)', () => {
    const suite = createTestApplication();

    const adminAuthorization = `Basic ${Buffer.from('admin:start123').toString('base64')}`;

    let masterRealmId: string;
    let realmBId: string;
    let selfClient: HTTPClient;

    beforeAll(async () => {
        await suite.setup();

        const { data: master } = await suite.client.realm.getOne('master');
        masterRealmId = master.id;

        const { data: realmB } = await suite.client.realm.create(createFakeRealm());
        realmBId = realmB.id;

        // two logins in master, one in realm B; every stats read below happens
        // after the seeding, since a read is cached per actor for a minute
        const userM1 = createFakeUser();
        await suite.client.user.create(userM1);
        const grant = await suite.client.token.createWithPassword({
            username: userM1.name,
            password: userM1.password!,
        });
        selfClient = new HTTPClient({ baseURL: suite.baseURL });
        selfClient.setAuthorizationHeader({ type: 'Bearer', token: grant.access_token });

        const userM2 = createFakeUser();
        await suite.client.user.create(userM2);
        await suite.client.token.createWithPassword({
            username: userM2.name,
            password: userM2.password!,
        });

        const userB = createFakeUser({ realmId: realmB.id });
        await suite.client.user.create(userB);
        await suite.client.token.createWithPassword({
            username: userB.name,
            password: userB.password!,
            realm_id: realmB.id,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('answers day buckets per (scope, name) over the default window', async () => {
        const { data, meta } = await suite.client.event.getStats();

        expect(meta.granularity).toEqual(StatsGranularity.DAY);
        expect(meta.days).toEqual(30);
        expect(meta.enabled).toBe(true);
        expect(meta.from).toMatch(DAY_BUCKET);
        expect(new Date(meta.to).getTime()).toBeLessThanOrEqual(Date.now());
        expect(new Date(meta.from).getTime()).toBeLessThan(new Date(meta.to).getTime());

        expect(data.length).toBeGreaterThan(0);
        for (const row of data) {
            expect(row.bucket).toMatch(DAY_BUCKET);
            expect(row.count).toBeTypeOf('number');
            expect(row.count).toBeGreaterThan(0);
            expect(new Date(row.bucket).getTime()).toBeGreaterThanOrEqual(new Date(meta.from).getTime());
        }

        expect(countOf(data, EventName.LOGIN)).toBeGreaterThanOrEqual(3);
    });

    it('answers hour buckets when asked to', async () => {
        const { data, meta } = await suite.client.event.getStats({ granularity: 'hour', days: 1 });

        expect(meta.granularity).toEqual(StatsGranularity.HOUR);
        expect(meta.from).toMatch(HOUR_BUCKET);
        for (const row of data) {
            expect(row.bucket).toMatch(HOUR_BUCKET);
        }

        expect(countOf(data, EventName.LOGIN)).toBeGreaterThanOrEqual(3);
    });

    it('decodes the filter through the event schema: the realm switcher scope', async () => {
        const { data, meta } = await suite.client.event.getStats({ filters: { realmId: [realmBId, null] } });

        expect(countOf(data, EventName.LOGIN)).toEqual(1);
        expect(meta.schema.filters?.allowed).toContain('realmId');
    });

    it('decodes the filter through the event schema: one event type', async () => {
        const { data } = await suite.client.event.getStats({
            filters: { name: EventName.LOGIN },
            days: 7,
        });

        expect(data.length).toBeGreaterThan(0);
        expect(data.every((row) => row.name === EventName.LOGIN)).toBe(true);
        expect(countOf(data, EventName.LOGIN)).toBeGreaterThanOrEqual(3);
    });

    it('refuses a filter key the event schema does not allow', async () => {
        await expectClientError(
            () => suite.client.event.getStats({ filters: { requestUserAgent: 'curl' } }),
            { status: 400 },
        );
    });

    it('takes the realm from the nested mount, by id and by name', async () => {
        const byId = await httpRequest(suite, 'GET', `/realms/${realmBId}/events/@stats`, { headers: { Authorization: adminAuthorization } });
        expect(byId.status).toEqual(200);
        const { data: dataB } = await byId.json();
        expect(countOf(dataB, EventName.LOGIN)).toEqual(1);

        const byName = await httpRequest(suite, 'GET', '/realms/master/events/@stats?days=7', { headers: { Authorization: adminAuthorization } });
        expect(byName.status).toEqual(200);
        const { data: dataMaster } = await byName.json();
        expect(countOf(dataMaster, EventName.LOGIN)).toBeGreaterThanOrEqual(2);
        expect(countOf(dataMaster, EventName.LOGIN)).toEqual(
            countOf((await suite.client.event.getStats({ filters: { realmId: masterRealmId }, days: 7 })).data, EventName.LOGIN),
        );
    });

    it('counts only the own rows of an actor without event_read', async () => {
        const { data } = await selfClient.event.getStats();

        expect(data).toHaveLength(1);
        expect(data[0].name).toEqual(EventName.LOGIN);
        expect(data[0].count).toEqual(1);
    });

    it('refuses a window past the bucket ceiling', async () => {
        await expectClientError(
            () => suite.client.event.getStats({ granularity: 'hour', days: 32 }),
            { status: 400 },
        );
        await expectClientError(
            () => suite.client.event.getStats({ days: 0 }),
            { status: 400, code: ErrorCode.BAD_REQUEST },
        );
    });

    it('requires an identity', async () => {
        const response = await httpRequest(suite, 'GET', '/events/@stats');
        expect(response.status).toEqual(401);
    });
});

describe('src/http/controllers/entities/event (stats, log disabled)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.eventLogEnabled = false;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('reports the disabled log', async () => {
        const { meta } = await suite.client.event.getStats({ days: 7 });

        expect(meta.enabled).toBe(false);
    });
});
