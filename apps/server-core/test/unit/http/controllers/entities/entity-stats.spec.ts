/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityStatsResponse } from '@authup/core-http-kit';
import { buildQueryString } from '@authup/core-http-kit';
import { defineQuery, gt } from '@rapiq/core';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { BuiltInPolicyType } from '@authup/access';
import { createFakeRealm, createFakeUser, httpRequest } from '../../../../utils';
import { createFakeTimePolicy } from '../../../../utils/domains/policy';

const DAY_BUCKET = /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/;

// every collection an admin-console section lists; `@stats` must reach the
// statistic on each, never that controller's `/:id` read
const STATS_COLLECTIONS = [
    'clients',
    'events',
    'identity-providers',
    'keys',
    'paths',
    'permissions',
    'policies',
    'realms',
    'roles',
    'scopes',
    'sessions',
    'trust-anchors',
    'users',
];

describe('src/http/controllers/entities/* (@stats)', () => {
    const suite = createTestApplication();

    const adminAuthorization = `Basic ${Buffer.from('admin:start123').toString('base64')}`;

    let realmId: string;
    let userToken: string;

    async function read(path: string, authorization = adminAuthorization): Promise<{ status: number, body: EntityStatsResponse }> {
        const response = await httpRequest(suite, 'GET', path, { headers: { Authorization: authorization } });

        return { status: response.status, body: await response.json() };
    }

    beforeAll(async () => {
        await suite.setup();

        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        realmId = realm.id;

        const first = createFakeUser({ realmId });
        await suite.client.user.create(first);
        await suite.client.user.create(createFakeUser({ realmId }));

        const grant = await suite.client.token.createWithPassword({
            username: first.name,
            password: first.password!,
            realm_id: realmId,
        });
        userToken = grant.access_token;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it.each(STATS_COLLECTIONS)('serves the statistic of %s', async (collection) => {
        const { status, body } = await read(`/${collection}/@stats`);

        expect(status).toEqual(200);
        expect(typeof body.meta.total).toEqual('number');
        expect(body.meta.days).toEqual(30);
        expect(body.meta.schema).toBeDefined();
    });

    it('counts users created in the window, and every one of them in the total', async () => {
        const { body } = await read(`/users/@stats${buildQueryString({ filters: { realmId } })}`);

        expect(body.meta.total).toEqual(2);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].bucket).toMatch(DAY_BUCKET);
        expect(body.data[0].count).toEqual(2);
    });

    it('scopes the statistic to the route realm', async () => {
        const nested = await read(`/realms/${realmId}/users/@stats`);
        const flat = await read('/users/@stats');

        expect(nested.body.meta.total).toEqual(2);
        expect(flat.body.meta.total).toBeGreaterThan(2);
    });

    it('counts the active sessions through a filter on their expiry', async () => {
        const query = buildQueryString(defineQuery({ filters: gt('expiresAt', new Date().toISOString()) }));
        const { body } = await read(`/sessions/@stats${query}`);

        expect(body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('counts an unprivileged user its own sessions only', async () => {
        const { status, body } = await read('/sessions/@stats', `Bearer ${userToken}`);

        expect(status).toEqual(200);
        expect(body.meta.total).toEqual(1);
    });

    it('refuses an unprivileged user the user statistic, like the list', async () => {
        const { status } = await read('/users/@stats', `Bearer ${userToken}`);

        // the user list pre-gates on USER_READ, and the statistic is gated
        // exactly like it
        expect(status).toEqual(403);
    });

    it('refuses an anonymous caller where the list does', async () => {
        const response = await httpRequest(suite, 'GET', '/users/@stats');

        expect(response.status).toEqual(401);
    });

    it('answers an anonymous caller where the list does', async () => {
        const response = await httpRequest(suite, 'GET', '/realms/@stats');

        expect(response.status).toEqual(200);
    });

    it('counts a row once however many to-many join rows its filter matches', async () => {
        const name = `composite-${Date.now()}`;
        await suite.client.policy.createBuiltIn({
            name,
            type: BuiltInPolicyType.COMPOSITE,
            invert: false,
            children: [
                createFakeTimePolicy(),
                createFakeTimePolicy(),
                createFakeTimePolicy(),
            ],
        });

        const { status, body } = await read(`/policies/@stats?filter[name]=${name}&filter[children.type]=${BuiltInPolicyType.TIME}`);

        expect(status).toEqual(200);
        expect(body.meta.total).toEqual(1);
        expect(body.data.reduce((sum, row) => sum + row.count, 0)).toEqual(1);
    });
});
