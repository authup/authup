/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path, Realm } from '@authup/core-kit';
import { ROLE_REALM_ADMIN_NAME } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import {
    createFakePath,
    createFakeRealm,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../utils';

const ADMIN_AUTHORIZATION = `Basic ${Buffer.from('admin:start123').toString('base64')}`;

describe('src/http/controllers/path', () => {
    const suite = createTestApplication();

    // a realm per spec keeps the folder names deterministic on the
    // suite-shared database, and the second realm is what the isolation
    // assertions need anyway.
    let realm : Realm;
    let otherRealm : Realm;

    let realmAdmin : HTTPClient;

    let sales : Path;
    let berlin : Path;
    let userId : string;

    beforeAll(async () => {
        await suite.setup();

        realm = (await suite.client.realm.create(createFakeRealm())).data;
        otherRealm = (await suite.client.realm.create(createFakeRealm())).data;

        // a realm_admin of the SECOND realm: it holds PATH_CREATE/UPDATE/DELETE
        // at `own` reach, so its own realm is writable and the first one is not.
        const password = 'path-realm-admin-pw';
        const { data: user } = await suite.client.user.create(
            createFakeUser({
                realmId: otherRealm.id,
                password,
            }),
        );
        const { data: role } = await suite.client.role.getOne(ROLE_REALM_ADMIN_NAME);
        await suite.client.userRole.create({
            userId: user.id,
            roleId: role.id,
        });

        const token = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: otherRealm.id,
        });

        realmAdmin = new HTTPClient({ baseURL: suite.baseURL });
        realmAdmin.setAuthorizationHeader({
            type: 'Bearer',
            token: token.access_token,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should create a root folder and a child carrying the derived path', async () => {
        const { data: root } = await suite.client.path.create({
            ...createFakePath({ name: 'sales' }),
            realmId: realm.id,
        });

        expect(root.name).toEqual('sales');
        expect(root.path).toEqual('sales');
        expect(root.parentId).toBeNull();
        expect(root.realmId).toEqual(realm.id);

        sales = root;

        const { data: child } = await suite.client.path.create({
            ...createFakePath({ name: 'berlin' }),
            parentId: sales.id,
            realmId: realm.id,
        });

        expect(child.name).toEqual('berlin');
        expect(child.path).toEqual('sales/berlin');
        expect(child.parentId).toEqual(sales.id);

        berlin = child;
    });

    it('should list the subtree through the path prefix filter', async () => {
        // `sales/~` is the simple dialect's startsWith: the DESCENDANTS, never
        // the folder itself, so the two queries together are the subtree.
        const descendants = await httpRequest(
            suite,
            'GET',
            `/paths?filter[path]=${encodeURIComponent('sales/~')}`,
            { headers: { Authorization: ADMIN_AUTHORIZATION } },
        );
        expect(descendants.status).toEqual(200);

        const descendantsBody = await descendants.json() as { data: Path[] };
        expect(descendantsBody.data.map((entity) => entity.path)).toEqual(['sales/berlin']);

        const self = await httpRequest(
            suite,
            'GET',
            '/paths?filter[path]=sales',
            { headers: { Authorization: ADMIN_AUTHORIZATION } },
        );
        expect(self.status).toEqual(200);

        const selfBody = await self.json() as { data: Path[] };
        expect(selfBody.data.map((entity) => entity.path)).toEqual(['sales']);
    });

    it('should rewrite every descendant on a rename', async () => {
        const { data: renamed } = await suite.client.path.update(sales.id, { name: 'marketing' });
        expect(renamed.path).toEqual('marketing');

        const { data: reread } = await suite.client.path.getOne(berlin.id);
        expect(reread.path).toEqual('marketing/berlin');
    });

    it('should file a user under a folder and join it through include', async () => {
        const { data: user } = await suite.client.user.create({
            ...createFakeUser({ realmId: realm.id }),
            pathId: berlin.id,
        });

        expect(user.pathId).toEqual(berlin.id);
        userId = user.id;

        const { data: joined } = await suite.client.user.getOne(user.id, { relations: ['path'] });
        expect(joined.path?.path).toEqual('marketing/berlin');
    });

    it('should resolve a ROOT folder by its full path', async () => {
        const response = await suite.client.get(`realms/${realm.id}/paths/marketing`);
        expect(response.data.data.id).toEqual(sales.id);

        // a nested path carries a separator, so it is not one route segment
        // and no route serves it: `GET /paths/marketing/berlin` is a 404, not
        // a second way to address the child.
        await expectClientError(
            () => suite.client.get('paths/marketing/berlin'),
            { status: 404 },
        );
    });

    // The flat mount carries no realm, so the name resolves across realms:
    // a name unique to this spec is what makes the answer unambiguous.
    it('should resolve a folder by its full path on the flat mount', async () => {
        const { data: folder } = await suite.client.path.create({
            name: 'flat-read-3632',
            realmId: realm.id,
        });

        const response = await suite.client.get('paths/flat-read-3632');
        expect(response.data.data.id).toEqual(folder.id);
    });

    it('should keep a sibling out of the descendant rewrite when a name carries an underscore', async () => {
        // `_` is a single-character LIKE wildcard AND a legal path character,
        // so a raw `LIKE 'sales_eu/%'` also matches `salesxeu/...`.
        const { data: underscore } = await suite.client.path.create({
            name: 'sales_eu',
            realmId: realm.id,
        });
        const { data: sibling } = await suite.client.path.create({
            name: 'salesxeu',
            realmId: realm.id,
        });

        const { data: underscoreChild } = await suite.client.path.create({
            name: 'team',
            parentId: underscore.id,
            realmId: realm.id,
        });
        const { data: siblingChild } = await suite.client.path.create({
            name: 'team',
            parentId: sibling.id,
            realmId: realm.id,
        });

        await suite.client.path.update(underscore.id, { name: 'finance' });

        const { data: rewritten } = await suite.client.path.getOne(underscoreChild.id);
        expect(rewritten.path).toEqual('finance/team');

        const { data: untouched } = await suite.client.path.getOne(siblingChild.id);
        expect(untouched.path).toEqual('salesxeu/team');
    });

    it('should refuse a parent folder of another realm', async () => {
        await expectClientError(
            () => suite.client.path.create({
                name: 'imported',
                parentId: berlin.id,
                realmId: otherRealm.id,
            }),
            { status: 400 },
        );
    });

    it('should scope the nested realm mount', async () => {
        // the second realm holds no folder of its own yet, and `every` over an
        // empty array is vacuously true, so the row the mount must return is
        // created first
        const { data: imported } = await suite.client.path.create({
            name: 'imported',
            realmId: otherRealm.id,
        });

        const response = await httpRequest(
            suite,
            'GET',
            `/realms/${otherRealm.id}/paths`,
            { headers: { Authorization: ADMIN_AUTHORIZATION } },
        );
        expect(response.status).toEqual(200);

        const body = await response.json() as { data: Path[] };
        expect(body.data.some((entity) => entity.id === imported.id)).toBe(true);
        expect(body.data.every((entity) => entity.realmId === otherRealm.id)).toBe(true);
        expect(body.data.some((entity) => entity.id === berlin.id)).toBe(false);
    });

    it('should hold a realm_admin to its own realm', async () => {
        await expectClientError(
            () => realmAdmin.path.create({
                name: 'intruder',
                realmId: realm.id,
            }),
            { status: 403 },
        );

        const { data: own } = await realmAdmin.path.create({ name: 'engineering' });
        expect(own.realmId).toEqual(otherRealm.id);
        expect(own.path).toEqual('engineering');
    });

    it('should list a realm_admin only the folders of its own realm', async () => {
        const { data } = await realmAdmin.path.getMany();

        // the reach compiles into the WHERE, so the foreign rows are absent
        // from the page AND from the total
        expect(data.length).toBeGreaterThan(0);
        expect(data.every((entity) => entity.realmId === otherRealm.id)).toBe(true);
        expect(data.some((entity) => entity.path === 'engineering')).toBe(true);
        expect(data.some((entity) => entity.id === berlin.id)).toBe(false);
        expect(data.some((entity) => entity.id === sales.id)).toBe(false);
    });

    it('should refuse a realm_admin the single read of a foreign folder', async () => {
        // gating the list without the single read is the more dangerous half
        // (issue #3574): the flat mount resolves the row by id across realms
        // and the post-fetch realm match is what refuses it
        await expectClientError(
            () => realmAdmin.path.getOne(berlin.id),
            { status: 403 },
        );
    });

    it('should keep a foreign folder out of a realm_admin list under a fields projection', async () => {
        // a `fields=` projection replaces the schema default; this pins the
        // OUTCOME under it and not the adapter's force-select, which a
        // realm_admin cannot observe: its policy-free grant compiles to the
        // conditional verdict, so the reach runs as a WHERE and a foreign row
        // never reaches the projection (the same limit #3574 recorded)
        const { data } = await realmAdmin.path.getMany({ fields: ['id', 'name'] });

        expect(data.length).toBeGreaterThan(0);
        expect(data.some((entity) => entity.id === berlin.id)).toBe(false);
        expect(data.some((entity) => entity.id === sales.id)).toBe(false);
    });

    it('should delete a folder with its descendants and unfile its members', async () => {
        const response = await httpRequest(
            suite,
            'DELETE',
            `/paths/${sales.id}`,
            { headers: { Authorization: ADMIN_AUTHORIZATION } },
        );
        expect(response.status).toEqual(202);

        const body = await response.json() as { data: Path };
        expect(body.data.id).toEqual(sales.id);

        await expectClientError(
            () => suite.client.path.getOne(berlin.id),
            { status: 404 },
        );

        const { data: user } = await suite.client.user.getOne(userId);
        expect(user.pathId).toBeNull();
    });
});
