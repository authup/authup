/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { Realm } from '@authup/core-kit';
import {
    createFakeRealm,
    createFakeUser,
    httpRequest,
} from '../../../../utils/index.ts';
import { createTestApplication } from '../../../../app/index.ts';

describe('src/http/controllers/realm-scoped', () => {
    const suite = createTestApplication();
    const basicAuth = `Basic ${Buffer.from('admin:start123').toString('base64')}`;

    let masterRealm: Realm;
    let scopedRealm: Realm;

    beforeAll(async () => {
        await suite.setup();
        masterRealm = await suite.client.realm.getOne('master');
        scopedRealm = await suite.client.realm.create(createFakeRealm());
    });

    afterAll(async () => {
        await suite.teardown();
    });

    describe('user', () => {
        it('should list users via /realms/<name>/users', async () => {
            const response = await httpRequest(suite, 'GET', '/realms/master/users', { headers: { Authorization: basicAuth } });

            expect(response.status).toEqual(200);
            const body = await response.json();
            expect(body.data).toBeDefined();
            expect(Array.isArray(body.data)).toBe(true);
        });

        it('should list users via /realms/<uuid>/users', async () => {
            const response = await httpRequest(suite, 'GET', `/realms/${masterRealm.id}/users`, { headers: { Authorization: basicAuth } });

            expect(response.status).toEqual(200);
        });

        it('should resolve a mixed-case realm key and Basic username', async () => {
            const mixedCaseAuth = `Basic ${Buffer.from('ADMIN:start123').toString('base64')}`;
            const response = await httpRequest(suite, 'GET', '/realms/MASTER/users', { headers: { Authorization: mixedCaseAuth } });

            expect(response.status).toEqual(200);
        });

        it('should 404 on unknown realm key in path', async () => {
            const response = await httpRequest(suite, 'GET', '/realms/this-realm-does-not-exist/users', { headers: { Authorization: basicAuth } });

            expect(response.status).toEqual(404);
        });

        it('should create user under route realm, overriding body realm_id', async () => {
            // body points at scopedRealm (a realm the admin can't write to);
            // route says master. If the override works, the user lands in
            // master and the permission check passes (admin is in master).
            // If body won instead, the request would 403.
            const payload = { ...createFakeUser(), realm_id: scopedRealm.id };

            const response = await httpRequest(suite, 'POST', `/realms/${masterRealm.id}/users`, {
                headers: { Authorization: basicAuth, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            expect(response.status).toEqual(201);
            const body = await response.json();
            expect(body.realm_id).toEqual(masterRealm.id);
            expect(body.realm_id).not.toEqual(scopedRealm.id);
        });
    });

    describe.each([
        ['clients'],
        ['robots'],
        ['permissions'],
        ['policies'],
        ['identity-providers'],
    ])('nested mount smoke test: %s', (entity) => {
        it(`should expose GET /realms/master/${entity}`, async () => {
            const response = await httpRequest(suite, 'GET', `/realms/master/${entity}`, { headers: { Authorization: basicAuth } });

            expect(response.status).toEqual(200);
        });
    });
});
