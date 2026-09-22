/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path, Realm } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
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
    createFakeRealm,
    createFakeUser,
    expectClientError,
} from '../../../../utils';

describe('http/controllers/path (tree)', () => {
    const suite = createTestApplication();

    let realm : Realm;
    let otherRealm : Realm;
    let restricted : HTTPClient;

    const create = async (name: string, parentId?: string | null) => {
        const { data } = await suite.client.path.create({
            name,
            realmId: realm.id,
            ...(parentId ? { parentId } : {}),
        } as any);

        return data;
    };

    beforeAll(async () => {
        await suite.setup();

        realm = (await suite.client.realm.create(createFakeRealm())).data;
        otherRealm = (await suite.client.realm.create(createFakeRealm())).data;

        // a bearer holding USER_READ and explicitly NOT the PATH_* family:
        // the `path` relation is documented as deliberately ungated
        const password = 'audit-restricted-pw';
        const { data: user } = await suite.client.user.create(
            createFakeUser({ realmId: realm.id, password }),
        );
        const { data: role } = await suite.client.role.create({
            name: `audit-reader-${Date.now()}`,
            realmId: realm.id,
        } as any);

        for (const name of [PermissionName.USER_READ]) {
            const { data: permission } = await suite.client.permission.getOne(name);
            await suite.client.rolePermission.create({
                roleId: role.id,
                permissionId: permission.id,
            });
        }

        await suite.client.userRole.create({ userId: user.id, roleId: role.id });

        const token = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: realm.id,
        });

        restricted = new HTTPClient({ baseURL: suite.baseURL });
        restricted.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('rewrites a whole subtree when a mid-level folder is renamed', async () => {
        const a = await create('acme');
        const b = await create('europe', a.id);
        const c = await create('berlin', b.id);
        const d = await create('mitte', c.id);

        expect(d.path).toBe('acme/europe/berlin/mitte');

        // rename the MIDDLE folder
        await suite.client.path.update(b.id, { name: 'emea' } as any);

        const reread = async (id: string) => (await suite.client.path.getOne(id)).data.path;

        expect(await reread(a.id)).toBe('acme');
        expect(await reread(b.id)).toBe('acme/emea');
        expect(await reread(c.id)).toBe('acme/emea/berlin');
        expect(await reread(d.id)).toBe('acme/emea/berlin/mitte');
    });

    it('does not treat `_` in a folder name as a LIKE wildcard', async () => {
        const underscore = await create('a_b');
        await create('leaf', underscore.id);

        // `axb` matches the LIKE pattern `a_b/%` but is NOT a descendant
        const other = await create('axb');
        const otherLeaf = await create('leaf', other.id);

        await suite.client.path.update(underscore.id, { name: 'a_c' } as any);

        const { data: after } = await suite.client.path.getOne(otherLeaf.id);
        expect(after.path).toBe('axb/leaf');
    });

    it('does not rewrite a sibling sharing the renamed prefix', async () => {
        const sales = await create('sales');
        await create('berlin', sales.id);
        const sales2 = await create('sales2');
        const sales2Leaf = await create('berlin', sales2.id);

        await suite.client.path.update(sales.id, { name: 'marketing' } as any);

        expect((await suite.client.path.getOne(sales2.id)).data.path).toBe('sales2');
        expect((await suite.client.path.getOne(sales2Leaf.id)).data.path).toBe('sales2/berlin');
    });

    it('refuses a move under its own descendant and under a foreign realm parent', async () => {
        const root = await create('org');
        const child = await create('team', root.id);

        await expectClientError(
            () => suite.client.path.update(root.id, { parentId: child.id } as any),
            { status: 400 },
        );
        await expectClientError(
            () => suite.client.path.update(root.id, { parentId: root.id } as any),
            { status: 400 },
        );

        const { data: foreign } = await suite.client.path.create({
            name: 'foreign',
            realmId: otherRealm.id,
        } as any);

        await expectClientError(
            () => suite.client.path.update(root.id, { parentId: foreign.id } as any),
            { status: 400 },
        );
    });

    it('refuses two folders with the same name under one parent', async () => {
        const root = await create('dup');
        await create('same', root.id);

        await expectClientError(
            () => suite.client.path.create({
                name: 'same',
                realmId: realm.id,
                parentId: root.id,
            } as any),
            { status: 409 },
        );
    });

    it('keeps a filed user pointing at the folder across a rename, then unfiles it on delete', async () => {
        const dept = await create('dept');
        const sub = await create('sub', dept.id);

        const { data: user } = await suite.client.user.create(
            createFakeUser({ realmId: realm.id, pathId: sub.id } as any),
        );
        expect(user.pathId).toBe(sub.id);

        await suite.client.path.update(dept.id, { name: 'division' } as any);

        // the user follows by id: the joined relation reads the NEW path
        const { data: afterRename } = await suite.client.user.getOne(user.id, { relations: ['path'] } as any);
        expect(afterRename.pathId).toBe(sub.id);
        expect((afterRename as any).path.path).toBe('division/sub');

        // deleting the ANCESTOR cascades the subtree and unfiles the occupant
        await suite.client.path.delete(dept.id);

        await expectClientError(() => suite.client.path.getOne(sub.id), { status: 404 });

        const { data: afterDelete } = await suite.client.user.getOne(user.id);
        expect(afterDelete.pathId).toBeNull();
    });

    it('serves the folder relation to a reader that holds no PATH_* permission', async () => {
        const folder = await create('visible');
        const { data: user } = await suite.client.user.create(
            createFakeUser({ realmId: realm.id, pathId: folder.id } as any),
        );

        // the reader may not list folders
        await expectClientError(() => restricted.path.getMany(), { status: 403 });

        // but the ungated relation still hydrates on a user it may read
        const { data } = await restricted.user.getOne(user.id, { relations: ['path'] } as any);
        expect((data as any).path.path).toBe('visible');

        // and the id filter narrows the list
        const { data: filtered } = await restricted.user.getMany({ filters: { pathId: folder.id } } as any);
        expect(filtered.every((item) => item.pathId === folder.id)).toBe(true);
        expect(filtered.some((item) => item.id === user.id)).toBe(true);
    });

    it('enforces the depth cap', async () => {
        let parentId : string | null = null;
        let last : Path | null = null;

        for (let i = 0; i < 15; i++) {
            last = await create(`d${i}`, parentId);
            parentId = last.id;
        }

        expect(last).not.toBeNull();
        expect((last as Path).path.split('/').length).toBe(15);

        await expectClientError(
            () => suite.client.path.create({
                name: 'toodeep',
                realmId: realm.id,
                parentId,
            } as any),
            { status: 400 },
        );
    });
    // The cap is asserted on the moved folder AND on every rewritten
    // descendant, before the first write (#3632).
    it('enforces the depth cap on a move, for the folder and its descendants', async () => {
        let parentId : string | null = null;
        const chain : Path[] = [];

        for (let i = 0; i < 15; i++) {
            const entry = await create(`m${i}`, parentId);
            chain.push(entry);
            parentId = entry.id;
        }

        const mover = await create('mover');
        const child = await create('child', mover.id);

        // the folder itself would land at depth 16
        await expectClientError(
            () => suite.client.path.update(mover.id, { parentId: chain[14]!.id } as any),
            { status: 400 },
        );

        // the folder fits at depth 15, its child would not
        await expectClientError(
            () => suite.client.path.update(mover.id, { parentId: chain[13]!.id } as any),
            { status: 400 },
        );

        const { data: unchanged } = await suite.client.path.getOne(child.id);
        expect(unchanged.path).toBe('mover/child');
    });
});
