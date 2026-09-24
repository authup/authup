/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path, Realm } from '@authup/core-kit';
import { PATH_MAX_DEPTH } from '@authup/core-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    expectClientError,
} from '../../../../utils';

/**
 * Left to the database cascades, a delete reaching filed users and clients
 * through a folder chain exceeds mysql's limits (15 cascade levels, and from
 * MySQL 9 30 tables per statement): a realm holding a user three folders deep
 * could not be deleted. These run on every dialect; mysql is where they bite.
 */
describe('http/controllers/path (delete)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const createChain = async (realm: Realm) : Promise<Path[]> => {
        const chain : Path[] = [];
        for (let i = 0; i < PATH_MAX_DEPTH; i++) {
            const { data } = await suite.client.path.create({
                name: `level${i + 1}`,
                realmId: realm.id,
                ...(chain.length > 0 ? { parentId: chain[chain.length - 1].id } : {}),
            } as any);

            chain.push(data);
        }

        return chain;
    };

    const fileOccupants = async (realm: Realm, path: Path) => {
        const { data: user } = await suite.client.user.create({
            ...createFakeUser({ realmId: realm.id }),
            pathId: path.id,
        });

        const { data: client } = await suite.client.client.create({
            ...createFakeClient(),
            realmId: realm.id,
            pathId: path.id,
        });

        return { user, client };
    };

    it('should delete the root of a full-depth chain with occupants filed at the bottom', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const chain = await createChain(realm);
        const { user, client } = await fileOccupants(realm, chain[chain.length - 1]);

        await suite.client.path.delete(chain[0].id);

        await expectClientError(
            () => suite.client.path.getOne(chain[chain.length - 1].id),
            { status: 404 },
        );

        const { data: userReread } = await suite.client.user.getOne(user.id);
        expect(userReread.pathId).toBeNull();

        const { data: clientReread } = await suite.client.client.getOne(client.id);
        expect(clientReread.pathId).toBeNull();
    });

    it('should delete a folder in the middle and keep its ancestors', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const chain = await createChain(realm);
        const { user } = await fileOccupants(realm, chain[4]);

        await suite.client.path.delete(chain[3].id);

        const { data: parent } = await suite.client.path.getOne(chain[2].id);
        expect(parent.id).toEqual(chain[2].id);

        await expectClientError(
            () => suite.client.path.getOne(chain[3].id),
            { status: 404 },
        );

        const { data: userReread } = await suite.client.user.getOne(user.id);
        expect(userReread.pathId).toBeNull();
    });

    it('should delete a realm holding a full-depth chain with filed occupants', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const chain = await createChain(realm);
        await fileOccupants(realm, chain[2]);
        const { user } = await fileOccupants(realm, chain[chain.length - 1]);

        await suite.client.realm.delete(realm.id);

        await expectClientError(
            () => suite.client.realm.getOne(realm.id),
            { status: 404 },
        );

        await expectClientError(
            () => suite.client.user.getOne(user.id),
            { status: 404 },
        );

        const { meta } = await suite.client.path.getMany({ filters: { realmId: realm.id } });
        expect(meta.total).toEqual(0);
    });
});
