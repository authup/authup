/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { createFakeRealm } from '../../../../utils';

// A rename locks the folder, its resolved parent and its descendants, so a
// parent rename and a child rename take those rows in opposite orders. Only
// mysql and postgres take the locks at all: the sqlite seam is the unlocked
// passthrough, so there is no cycle to break there and nothing to observe.
const rowLockable = ['mysql', 'postgres'].includes(process.env.DB_TYPE ?? '');

describe.skipIf(!rowLockable)('http/controllers/path (concurrency)', () => {
    const suite = createTestApplication();

    let realm : Realm;

    beforeAll(async () => {
        await suite.setup();
        realm = (await suite.client.realm.create(createFakeRealm())).data;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should answer a parent rename racing a child rename', async () => {
        const failures : (number | undefined)[] = [];
        const rounds = 12;

        for (let i = 0; i < rounds; i++) {
            const { data: root } = await suite.client.path.create({
                name: `r${i}`,
                realmId: realm.id,
            } as any);

            const { data: child } = await suite.client.path.create({
                name: 'child',
                realmId: realm.id,
                parentId: root.id,
            } as any);

            const { data: leaf } = await suite.client.path.create({
                name: 'leaf',
                realmId: realm.id,
                parentId: child.id,
            } as any);


            const results = await Promise.allSettled([
                suite.client.path.update(root.id, { name: `rr${i}` } as any),
                suite.client.path.update(child.id, { name: 'kid' } as any),
            ]);

            for (const result of results) {
                if (result.status === 'rejected') {
                    failures.push((result.reason as any)?.response?.status);
                }
            }

            // Whichever order they commit in, the derived column must stay
            // consistent with the parent chain: a descendant is its parent's
            // path plus its own segment, never a stale prefix.

            const [{ data: rootAfter }, { data: childAfter }, { data: leafAfter }] = await Promise.all([
                suite.client.path.getOne(root.id),
                suite.client.path.getOne(child.id),
                suite.client.path.getOne(leaf.id),
            ]);

            expect(childAfter.path).toBe(`${rootAfter.path}/${childAfter.name}`);
            expect(leafAfter.path).toBe(`${childAfter.path}/${leafAfter.name}`);
        }

        // The server breaks the lock cycle by aborting one side; the
        // repository retries that rolled-back transaction, so no caller ever
        // sees the abort. Without the retry this ran at roughly nine 500s in
        // twenty-four renames.
        expect(failures).toEqual([]);
    }, 120_000);

    it('should not store a stale path when a child is created under a renaming parent', async () => {
        const desynced : string[] = [];
        const rounds = 12;

        for (let i = 0; i < rounds; i++) {
            const { data: root } = await suite.client.path.create({
                name: `p${i}`,
                realmId: realm.id,
            } as any);


            const results = await Promise.allSettled([
                suite.client.path.update(root.id, { name: `q${i}` } as any),
                suite.client.path.create({
                    name: 'kid',
                    realmId: realm.id,
                    parentId: root.id,
                } as any),
            ]);

            const created = results[1];
            if (created.status === 'rejected') {
                continue;
            }


            const [{ data: rootAfter }, { data: kidAfter }] = await Promise.all([
                suite.client.path.getOne(root.id),
                suite.client.path.getOne((created.value as any).data.id),
            ]);

            if (kidAfter.path !== `${rootAfter.path}/${kidAfter.name}`) {
                desynced.push(`${kidAfter.path} under ${rootAfter.path}`);
            }
        }

        // The insert derives its path from a parent read taken under a row
        // lock inside the same transaction. Deriving it from the unlocked
        // read the gates ran on stored a path the row's own parent chain
        // contradicted, permanently: this ran at 13 desyncs in 15 rounds.
        expect(desynced).toEqual([]);
    }, 120_000);
});
