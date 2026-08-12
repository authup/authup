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
import { createFakeRole, createFakeUser, httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

/**
 * The widened filter surface, EXECUTED rather than decoded. Passing the
 * index policy only proves a query is legal; it still has to survive the
 * adapter and the driver, and a predicate that binds wrong returns a
 * plausible-looking empty (or complete) result set rather than an error.
 *
 * The temporal keys here are all `varchar(28)` ISO columns, written with
 * `toISOString()` and therefore compared as plain strings against an
 * identically formatted bound value — dialect-independent. The
 * `@CreateDateColumn` timestamps (createdAt/updatedAt) are deliberately
 * NOT filterable for exactly that reason: their transformer applies on
 * read but not to a WHERE bind, so comparisons are silently inverted on
 * sqlite and equality never matches on any dialect.
 *
 * Assertions are written to hold on sqlite, mysql and postgres.
 */
describe('src/http/controllers/entities (widened query surface)', () => {
    const suite = createTestApplication();
    const basic = `Basic ${Buffer.from('admin:start123').toString('base64')}`;

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should filter users by the active state flag', async () => {
        const { data: user } = await suite.client.user.create({ ...createFakeUser(), active: true });

        // narrowed by id: a bare `filter[active]=true` returns a paginated
        // first page, so asserting membership there would depend on how many
        // rows other spec files left in this worker's database copy.
        const active = await httpRequest(suite, 'GET', `/users?filter[id]=${user.id}&filter[active]=true`, { headers: { Authorization: basic } });
        const activeBody = await active.json();
        expect(active.status).toEqual(200);
        expect(activeBody.data).toHaveLength(1);
        expect(activeBody.data[0].id).toEqual(user.id);

        const inactive = await httpRequest(suite, 'GET', `/users?filter[id]=${user.id}&filter[active]=false`, { headers: { Authorization: basic } });
        const inactiveBody = await inactive.json();
        expect(inactive.status).toEqual(200);
        expect(inactiveBody.data).toHaveLength(0);
    });

    it('should filter clients by builtIn', async () => {
        const builtIn = await httpRequest(suite, 'GET', '/clients?filter[builtIn]=true', { headers: { Authorization: basic } });
        const body = await builtIn.json();

        expect(builtIn.status).toEqual(200);
        // the per-realm system clients are provisioned builtIn
        expect(body.meta.total).toBeGreaterThan(0);
        expect(body.data.every((entity: any) => entity.builtIn === true)).toBe(true);
    });

    it('should filter a junction by id and by its owner realm key', async () => {
        const { data: role } = await suite.client.role.create(createFakeRole());
        const permissions = await suite.client.permission.getMany();
        expect(permissions.data.length).toBeGreaterThan(0);

        const { data: junction } = await suite.client.rolePermission.create({
            roleId: role.id,
            permissionId: permissions.data[0].id,
        });

        const byId = await httpRequest(suite, 'GET', `/role-permissions?filter[id]=${junction.id}`, { headers: { Authorization: basic } });
        const byIdBody = await byId.json();
        expect(byId.status).toEqual(200);
        expect(byIdBody.data).toHaveLength(1);
        expect(byIdBody.data[0].id).toEqual(junction.id);

        const realmId = junction.roleRealmId;
        const byRealm = await httpRequest(suite, 'GET', `/role-permissions?filter[roleRealmId]=${realmId}`, { headers: { Authorization: basic } });
        const byRealmBody = await byRealm.json();
        expect(byRealm.status).toEqual(200);
        expect(byRealmBody.meta.total).toBeGreaterThan(0);
        // predicate over the page rather than membership in it, for the
        // same pagination reason as above
        expect(byRealmBody.data.every((entity: any) => entity.roleRealmId === realmId)).toBe(true);
    });

    it('should filter sessions by the varchar ISO timestamp columns', async () => {
        // a password grant creates a real session row to compare against
        const grant = await suite.client.token.createWithPassword({
            username: 'admin',
            password: 'start123',
        });

        // pin the exact session, so every assertion below is about a known
        // row: a bare temporal filter would be satisfied vacuously by an
        // empty page, which is precisely what a mis-bound comparison returns
        const meResponse = await httpRequest(suite, 'GET', '/sessions/@me', { headers: { Authorization: `Bearer ${grant.access_token}` } });
        expect(meResponse.status).toEqual(200);
        const session = (await meResponse.json()).data;
        expect(session.expiresAt).toBeDefined();

        const past = new Date(Date.now() - 3600_000).toISOString();
        const beyondExpiry = new Date(Date.parse(session.expiresAt) + 60_000).toISOString();
        const scope = `/sessions?filter[id]=${session.id}`;

        // lower bound: the session expires in the future, so it is above `past`
        const above = await httpRequest(suite, 'GET', `${scope}&filter[expiresAt]=>${encodeURIComponent(past)}`, { headers: { Authorization: basic } });
        const aboveBody = await above.json();
        expect(above.status).toEqual(200);
        expect(aboveBody.data).toHaveLength(1);

        // upper bound, POSITIVE: a ceiling past its expiry must match it.
        // This is what proves `<` can select this row at all, so the empty
        // result below is the predicate discriminating rather than the
        // comparison silently failing to bind.
        const below = await httpRequest(suite, 'GET', `${scope}&filter[expiresAt]=<${encodeURIComponent(beyondExpiry)}`, { headers: { Authorization: basic } });
        const belowBody = await below.json();
        expect(below.status).toEqual(200);
        expect(belowBody.data).toHaveLength(1);

        // upper bound, NEGATIVE: a ceiling in the past must exclude it
        const excluded = await httpRequest(suite, 'GET', `${scope}&filter[expiresAt]=<${encodeURIComponent(past)}`, { headers: { Authorization: basic } });
        const excludedBody = await excluded.json();
        expect(excluded.status).toEqual(200);
        expect(excludedBody.data).toHaveLength(0);
    });
});
