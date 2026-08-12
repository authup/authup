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
        expect(grant.access_token).toBeDefined();

        const past = new Date(Date.now() - 3600_000).toISOString();

        // expiresAt is populated at creation and lies in the future.
        // (seenAt is deliberately not used here: it is nullable and only
        // stamped on ping/refresh, so a fresh session carries NULL.)
        const seen = await httpRequest(suite, 'GET', `/sessions?filter[expiresAt]=>${encodeURIComponent(past)}`, { headers: { Authorization: basic } });
        const seenBody = await seen.json();
        expect(seen.status).toEqual(200);
        expect(seenBody.meta.total).toBeGreaterThan(0);

        // every returned row must satisfy the predicate. Deliberately NOT
        // asserted as a fixed total: spec files sharing a worker's database
        // copy run sequentially against it, so another spec's expired
        // session is legitimately present and a count would flake.
        expect(seenBody.data.every((entity: any) => entity.expiresAt > past)).toBe(true);

        const expired = await httpRequest(suite, 'GET', `/sessions?filter[expiresAt]=<${encodeURIComponent(past)}`, { headers: { Authorization: basic } });
        const expiredBody = await expired.json();
        expect(expired.status).toEqual(200);
        expect(expiredBody.data.every((entity: any) => entity.expiresAt < past)).toBe(true);
        // the fresh session must be excluded by the upper bound, which is
        // what proves the comparison discriminates rather than mis-binding
        expect(expiredBody.data.some((entity: any) => entity.expiresAt > past)).toBe(false);
    });
});
