/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import { createAllowAllActor } from '@authup/server-test-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    ClientEntity,
    ClientRepositoryAdapter,
    RealmEntity,
    RealmRepositoryAdapter,
    UserRepository,
    UserRepositoryAdapter,
} from '../../../../../src';
import { ClientService, UserService } from '../../../../../src/core';
import { createTestApplication } from '../../../../app';
import { createFakeClient, createFakeUser } from '../../../../utils';

// Two concurrent saves of one row (#3526). The locked read-modify-write only
// exists on mysql and postgres: the sqlite fallback is the unlocked
// passthrough, so there the two awaited reads interleave and the lost update
// reproduces by design.
const rowLockable = ['mysql', 'postgres'].includes(process.env.DB_TYPE ?? '');

describe.skipIf(!rowLockable)('http/controllers/user (concurrency)', () => {
    // `eventLogEntityEnabled` is off here on purpose. The entity audit mirror
    // is a SECOND, pre-existing pinning site: `EntitySubscriber.afterInsert` /
    // `afterUpdate` run inside TypeORM's own persist transaction, and the
    // `EntityEventHandler` they await inserts the `auth_events` row through
    // the DataSource, on a second pooled connection. Ten concurrent entity
    // writes deadlock on that alone, with or without the #3526 seam, so the
    // pool pin below could never settle with it on. That site is issue #3539;
    // this file pins the save shape.
    const suite = createTestApplication({
        config: (config) => {
            config.eventLogEntityEnabled = false;
        },
    });
    const actor = createAllowAllActor();

    let realm: Realm;
    let userRepository: UserRepositoryAdapter;
    let userService: UserService;
    let clientRepository: ClientRepositoryAdapter;
    let clientService: ClientService;

    beforeAll(async () => {
        await suite.setup();

        const realmRepository = suite.dataSource.getRepository(RealmEntity);
        const realmRepositoryAdapter = new RealmRepositoryAdapter(realmRepository);
        realm = await realmRepositoryAdapter.resolve('', true);

        userRepository = new UserRepositoryAdapter({
            repository: new UserRepository(suite.dataSource),
            realmRepository,
        });
        userService = new UserService({
            repository: userRepository,
            realmRepository: realmRepositoryAdapter,
        });

        clientRepository = new ClientRepositoryAdapter({
            repository: suite.dataSource.getRepository(ClientEntity),
            realmRepository,
        });
        clientService = new ClientService({
            repository: clientRepository,
            realmRepository: realmRepositoryAdapter,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should keep the emailVerified reset when an unrelated edit runs concurrently', async () => {
        const created = await userService.create({
            ...createFakeUser({ emailVerified: true }),
            realmId: realm.id,
        }, actor);
        const { email: next } = createFakeUser();

        await Promise.all([
            userService.update(created.id, { displayName: 'Concurrent Edit' }, actor),
            userService.update(created.id, { email: next }, actor),
        ]);

        const row = await userRepository.findOneByWithEmail({ id: created.id });
        expect(row?.email).toBe(next);
        expect(row?.emailVerified).toBe(false);
        expect(row?.displayName).toBe('Concurrent Edit');
    });

    it('should keep a concurrent user deactivation', async () => {
        const created = await userService.create({
            ...createFakeUser(),
            realmId: realm.id,
        }, actor);

        await Promise.all([
            userService.update(created.id, { displayName: 'Concurrent Edit' }, actor),
            userService.update(created.id, { active: false }, actor),
        ]);

        const row = await userRepository.findOneBy({ id: created.id });
        expect(row?.active).toBe(false);
        expect(row?.displayName).toBe('Concurrent Edit');
    });

    it('should keep a concurrent client deactivation', async () => {
        const created = await clientService.create({
            ...createFakeClient(),
            realmId: realm.id,
        }, actor);

        await Promise.all([
            clientService.update(created.id, { displayName: 'Concurrent Edit' }, actor),
            clientService.update(created.id, { active: false }, actor),
        ]);

        const row = await clientRepository.findOneBy({ id: created.id });
        expect(row?.active).toBe(false);
        expect(row?.displayName).toBe('Concurrent Edit');
    });

    // The console posts its whole form, so an unrelated edit can carry a
    // stale `active: true`. A field echoed back with the value the request
    // read is no intent to change it and must not be written.
    it('should not undo a concurrent deactivation with an echoed active flag', async () => {
        const created = await userService.create({
            ...createFakeUser(),
            realmId: realm.id,
        }, actor);

        await Promise.all([
            userService.update(created.id, { displayName: 'Concurrent Edit', active: true }, actor),
            userService.update(created.id, { active: false }, actor),
        ]);

        const row = await userRepository.findOneBy({ id: created.id });
        expect(row?.active).toBe(false);
        expect(row?.displayName).toBe('Concurrent Edit');
    });

    // The secret normalization follows the row's authMethod. Read before the
    // lock it would clear the credential a concurrent switch to `secret`
    // just stored.
    it('should keep the secret of a concurrent switch to secret authentication', async () => {
        const created = await clientService.create({
            ...createFakeClient({ authMethod: 'none', secret: null }),
            realmId: realm.id,
        }, actor);

        await Promise.all([
            clientService.update(created.id, { displayName: 'Concurrent Edit' }, actor),
            clientService.update(created.id, { authMethod: 'secret', secret: 'concurrent-secret-1234' }, actor),
        ]);

        const row = await clientRepository.findOneWithSecret({ id: created.id });
        expect(row?.authMethod).toBe('secret');
        expect(row?.secret).toBeTruthy();
        expect(row?.displayName).toBe('Concurrent Edit');
    });

    // Ten concurrent saves deadlocked the whole DataSource while the entire
    // save ran inside the transaction: it pinned one pooled connection, and
    // the realm resolve, the join-column check and the uniqueness check each
    // took a second one from the same pool (size 10, unbounded wait on both
    // drivers). Only the write is transactional now, so the pin is that these
    // settle at all; vitest's timeout turns the hang into a failure.
    it('should not exhaust the connection pool under concurrent user saves', async () => {
        const users = await Promise.all(Array.from({ length: 12 }, () => userService.create({
            ...createFakeUser(),
            realmId: realm.id,
        }, actor)));

        // A realm key in the body scopes the row lookup and is resolved before
        // the row is loaded. By NAME that resolve is uncached, so it is the
        // read that reached for the second connection.
        const updated = await Promise.all(users.map((user, index) => userService.update(user.id, {
            realmId: realm.name,
            displayName: `Concurrent ${index}`,
        }, actor)));

        expect(updated.map((user) => user.displayName)).toEqual(
            users.map((_, index) => `Concurrent ${index}`),
        );
    });

    it('should not exhaust the connection pool under concurrent client saves', async () => {
        const clients = await Promise.all(Array.from({ length: 12 }, () => clientService.create({
            ...createFakeClient(),
            realmId: realm.id,
        }, actor)));

        const updated = await Promise.all(clients.map((client, index) => clientService.update(client.id, { displayName: `Concurrent ${index}` }, actor)));

        expect(updated.map((client) => client.displayName)).toEqual(
            clients.map((_, index) => `Concurrent ${index}`),
        );
    });
});
