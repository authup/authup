/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Event } from '@authup/core-kit';
import { EventName, EventScope } from '@authup/core-kit';
import type { EventStatsQuery, EventStatsRow } from '@authup/core-http-kit';
import { Client as HTTPClient, buildQueryString } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import type { ICondition } from '@rapiq/core';
import {
    and,
    eq,
    gte,
    inArray,
    lt,
} from '@rapiq/core';
import type { DataSource } from 'typeorm';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { EventEntity } from '../../../../../src/adapters/database/domains/index.ts';
import { DatabaseInjectionKey } from '../../../../../src/app/modules/database/index.ts';
import { createTestApplication } from '../../../../app';
import {
    createFakeRealm,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../utils';

const DAY_BUCKET = /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/;
const HOUR_BUCKET = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/;

const HOUR_IN_MS = 3_600_000;
const DAY_IN_MS = 86_400_000;

function countOf(data: EventStatsRow[], name: `${EventName}`): number {
    return data
        .filter((row) => row.name === name)
        .reduce((sum, row) => sum + row.count, 0);
}

function since(ms: number): string {
    return new Date(Date.now() - ms).toISOString();
}

/**
 * A statistic per (bucket, scope, name) since `from`, the other conditions
 * ANDed onto the lower bound.
 */
function buildQuery(
    unit: 'hour' | 'day',
    from: string,
    ...conditions: ICondition[]
): EventStatsQuery {
    const lower = gte('createdAt', from);

    return {
        filters: conditions.length > 0 ? and(lower, ...conditions) : lower,
        groups: [{ name: 'bucket', params: ['createdAt', unit] }, 'scope', 'name'],
        aggregates: ['count'],
    };
}

describe('src/http/controllers/entities/event (stats)', () => {
    const suite = createTestApplication();

    const adminAuthorization = `Basic ${Buffer.from('admin:start123').toString('base64')}`;

    let masterRealmId: string;
    let realmBId: string;
    let selfClient: HTTPClient;
    let dataSource: DataSource;

    beforeAll(async () => {
        await suite.setup();

        dataSource = suite.container.resolve(DatabaseInjectionKey.DataSource);

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

    it('spells the grouped read on the wire as the documented contract', () => {
        const url = decodeURIComponent(buildQueryString<Event>(buildQuery('day', '2026-09-01T00:00:00.000Z')));

        expect(url).toContain('filter=gte(createdAt,\'2026-09-01T00:00:00.000Z\')');
        expect(url).toContain('group=bucket(createdAt,day),scope,name');
        expect(url).toContain('aggregate=count');
    });

    it('answers day buckets per (scope, name)', async () => {
        const { data, meta } = await suite.client.event.getStats(buildQuery('day', since(30 * DAY_IN_MS)));

        expect(meta.bucket).toEqual('day');
        expect(meta.enabled).toBe(true);
        expect(meta.from).toMatch(DAY_BUCKET);
        expect(new Date(meta.to).getTime()).toBeLessThanOrEqual(Date.now());
        expect(new Date(meta.from).getTime()).toBeLessThan(new Date(meta.to).getTime());

        expect(data.length).toBeGreaterThan(0);
        for (const row of data) {
            expect(row.createdAt).toMatch(DAY_BUCKET);
            expect(row.count).toBeTypeOf('number');
            expect(row.count).toBeGreaterThan(0);
            expect(new Date(row.createdAt).getTime()).toBeGreaterThanOrEqual(new Date(meta.from).getTime());
        }

        expect(countOf(data, EventName.LOGIN)).toBeGreaterThanOrEqual(3);
    });

    it('answers hour buckets when asked to', async () => {
        const { data, meta } = await suite.client.event.getStats(buildQuery('hour', since(DAY_IN_MS)));

        expect(meta.bucket).toEqual('hour');
        expect(meta.from).toMatch(HOUR_BUCKET);
        for (const row of data) {
            expect(row.createdAt).toMatch(HOUR_BUCKET);
        }

        expect(countOf(data, EventName.LOGIN)).toBeGreaterThanOrEqual(3);
    });

    it('buckets a UTC day edge into the two days it separates', async () => {
        const refId = randomUUID();
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const before = new Date(today.getTime() - 1000);

        const repository = dataSource.getRepository<Event>(EventEntity);
        for (const createdAt of [before, today]) {
            const entity = await repository.save(repository.create({
                id: randomUUID(),
                scope: EventScope.OAUTH2,
                name: EventName.LOGOUT,
                refType: 'edge',
                refId,
            }));
            await repository.update({ id: entity.id }, { createdAt: createdAt.toISOString() });
        }

        const { data } = await suite.client.event.getStats(
            buildQuery('day', new Date(today.getTime() - (2 * DAY_IN_MS)).toISOString(), eq('refId', refId)),
        );

        expect(data.map((row) => [row.createdAt, row.count]).sort()).toEqual([
            [new Date(today.getTime() - DAY_IN_MS).toISOString(), 1],
            [today.toISOString(), 1],
        ]);
    });

    it('decodes the filter through the event schema: the realm switcher scope', async () => {
        const { data, meta } = await suite.client.event.getStats(
            buildQuery('day', since(30 * DAY_IN_MS), inArray('realmId', [realmBId, null])),
        );

        expect(countOf(data, EventName.LOGIN)).toEqual(1);
        expect(meta.schema.filters?.allowed).toContain('realmId');
    });

    it('decodes the filter through the event schema: one event type', async () => {
        const { data } = await suite.client.event.getStats(
            buildQuery('day', since(7 * DAY_IN_MS), eq('name', EventName.LOGIN)),
        );

        expect(data.length).toBeGreaterThan(0);
        expect(data.every((row) => row.name === EventName.LOGIN)).toBe(true);
        expect(countOf(data, EventName.LOGIN)).toBeGreaterThanOrEqual(3);
    });

    it('refuses a filter key the event schema does not allow', async () => {
        await expectClientError(
            () => suite.client.event.getStats(
                buildQuery('day', since(DAY_IN_MS), eq('requestUserAgent', 'curl')),
            ),
            { status: 400 },
        );
    });

    it('takes the realm from the nested mount, by id and by name', async () => {
        const query = buildQueryString<Event>(buildQuery('day', since(7 * DAY_IN_MS)));

        const byId = await httpRequest(suite, 'GET', `/realms/${realmBId}/events/@stats${query}`, { headers: { Authorization: adminAuthorization } });
        expect(byId.status).toEqual(200);
        const { data: dataB } = await byId.json();
        expect(countOf(dataB, EventName.LOGIN)).toEqual(1);

        const byName = await httpRequest(suite, 'GET', `/realms/master/events/@stats${query}`, { headers: { Authorization: adminAuthorization } });
        expect(byName.status).toEqual(200);
        const { data: dataMaster } = await byName.json();
        expect(countOf(dataMaster, EventName.LOGIN)).toBeGreaterThanOrEqual(2);
        expect(countOf(dataMaster, EventName.LOGIN)).toEqual(
            countOf((await suite.client.event.getStats(
                buildQuery('day', since(7 * DAY_IN_MS), eq('realmId', masterRealmId)),
            )).data, EventName.LOGIN),
        );
    });

    it('counts only the own rows of an actor without event_read', async () => {
        const { data } = await selfClient.event.getStats(buildQuery('day', since(30 * DAY_IN_MS)));

        expect(data).toHaveLength(1);
        expect(data[0].name).toEqual(EventName.LOGIN);
        expect(data[0].count).toEqual(1);
    });

    it('refuses a read without a lower bound on the date column', async () => {
        await expectClientError(
            () => suite.client.event.getStats({
                groups: [{ name: 'bucket', params: ['createdAt', 'day'] }],
                aggregates: ['count'],
            }),
            {
                status: 400,
                code: ErrorCode.BAD_REQUEST,
                data: { message: 'The filter must carry a lower bound on createdAt.' },
            },
        );
    });

    it('refuses a window past the bucket ceiling', async () => {
        await expectClientError(
            () => suite.client.event.getStats(buildQuery('hour', since(745 * HOUR_IN_MS))),
            { status: 400, data: { message: 'The window spans more than 744 buckets.' } },
        );
    });

    it('bounds the window above by the filter', async () => {
        const to = new Date();
        to.setUTCHours(0, 0, 0, 0);
        const { data, meta } = await suite.client.event.getStats(
            buildQuery('day', new Date(to.getTime() - (7 * DAY_IN_MS)).toISOString(), lt('createdAt', to.toISOString())),
        );

        expect(meta.to).toEqual(to.toISOString());
        for (const row of data) {
            expect(new Date(row.createdAt).getTime()).toBeLessThan(to.getTime());
        }
    });

    it('requires an identity', async () => {
        const query = buildQueryString<Event>(buildQuery('day', since(DAY_IN_MS)));
        const response = await httpRequest(suite, 'GET', `/events/@stats${query}`);
        expect(response.status).toEqual(401);
    });
});

describe('src/http/controllers/entities/event (stats, log disabled)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.eventLogEnabled = false;
            config.eventLogRetentionDays = 30;
            config.eventLogEntityRetentionDays = 3;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('reports the disabled log', async () => {
        const { meta } = await suite.client.event.getStats(buildQuery('day', since(7 * DAY_IN_MS)));

        expect(meta.enabled).toBe(false);
    });

    it('reports both retentions, so a client never offers a window past them', async () => {
        const { meta } = await suite.client.event.getStats(buildQuery('day', since(7 * DAY_IN_MS)));

        expect(meta.retentionDays).toEqual(30);
        expect(meta.entityRetentionDays).toEqual(3);
    });

    it('refuses hour buckets past the raw retention', async () => {
        await expectClientError(
            () => suite.client.event.getStats(buildQuery('hour', since((30 * DAY_IN_MS) + (2 * HOUR_IN_MS)))),
            { status: 400, data: { message: 'Hour buckets reach back 30 days.' } },
        );
    });
});
