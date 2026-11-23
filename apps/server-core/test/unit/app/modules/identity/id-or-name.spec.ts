/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Client, Realm } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    ClientEntity,
    RealmEntity,
    UserEntity,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../../../src/adapters/database/domains/index.ts';
import { DatabaseInjectionKey } from '../../../../../src/app/index.ts';
import { RealmRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/index.ts';
import { ClientIdentityRepository, UserIdentityRepository } from '../../../../../src/app/modules/identity/index.ts';
import { OAuth2ClientRepository } from '../../../../../src/app/modules/oauth2/repositories/index.ts';
import { createTestApplication } from '../../../../app/index.ts';
import { createFakeClient, createFakeUser } from '../../../../utils/index.ts';

// #3848: a name may be shaped like a uuid. An id match wins, an id miss
// falls back to the name.
describe('app/modules (uuid-shaped names on the auth surface)', () => {
    const suite = createTestApplication();

    let realm: Realm;
    let clients: ClientIdentityRepository;
    let users: UserIdentityRepository;
    let oauth2Clients: OAuth2ClientRepository;
    let realms: RealmRepositoryAdapter;

    beforeAll(async () => {
        await suite.setup();

        const { dataSource } = suite;
        const cache = suite.container.resolve(DatabaseInjectionKey.QueryCache);

        realm = (await dataSource.getRepository(RealmEntity).findOneBy({ name: 'master' }))!;
        realms = new RealmRepositoryAdapter(dataSource.getRepository(RealmEntity), cache);
        clients = new ClientIdentityRepository(dataSource.getRepository(ClientEntity) as Repository<Client>, cache, realms);
        users = new UserIdentityRepository({
            repository: new UserRepository(dataSource),
            userPermissionRepository: dataSource.getRepository(UserPermissionEntity),
            userRoleRepository: dataSource.getRepository(UserRoleEntity),
            cache,
            realmRepository: realms,
        });
        oauth2Clients = new OAuth2ClientRepository(dataSource.getRepository(ClientEntity) as Repository<Client>, realms);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function createClient(name: string) {
        return suite.dataSource.getRepository(ClientEntity).save({
            ...createFakeClient(), 
            name, 
            realmId: realm.id, 
        });
    }

    it('resolves a client by a uuid-shaped name, and an id match first', async () => {
        const named = await createClient(randomUUID());

        expect((await clients.findOneByIdOrName(named.name))?.id).toEqual(named.id);
        expect((await clients.findOneByIdOrName(named.name, realm.name))?.id).toEqual(named.id);
        expect((await clients.findOneByName(named.name, realm.id))?.id).toEqual(named.id);
        await expect(clients.findOneById(named.name)).resolves.toBeNull();

        expect((await oauth2Clients.findOneByIdOrName(named.name, realm.id))?.id).toEqual(named.id);
        // a name without a realm is ambiguous on the oauth2 surface
        await expect(oauth2Clients.findOneByIdOrName(named.name)).resolves.toBeNull();

        const shadow = await createClient(named.id);

        expect((await clients.findOneByIdOrName(named.id))?.id).toEqual(named.id);
        expect((await oauth2Clients.findOneByIdOrName(named.id, realm.id))?.id).toEqual(named.id);
        expect((await clients.findOneByName(named.id, realm.id))?.id).toEqual(shadow.id);
    });

    it('resolves a user by a uuid-shaped name', async () => {
        const name = randomUUID();
        const user = await suite.dataSource.getRepository(UserEntity).save({
            ...createFakeUser(),
            name,
            realmId: realm.id,
        });

        expect((await users.findOneByIdOrName(name, realm.name))?.id).toEqual(user.id);
        expect((await users.findOneByName(name, realm.id))?.id).toEqual(user.id);
        expect((await users.findOneByIdOrName(user.id))?.id).toEqual(user.id);
    });

    it('resolves a realm by a uuid-shaped name', async () => {
        const name = randomUUID();
        const entity = await suite.dataSource.getRepository(RealmEntity).save({ name });

        expect((await realms.findOneByIdOrName(name))?.id).toEqual(entity.id);
        await expect(realms.resolveId(name)).resolves.toEqual(entity.id);
        await expect(realms.resolveId(entity.id)).resolves.toEqual(entity.id);

        const unknown = randomUUID();

        await expect(realms.resolveId(unknown)).resolves.toEqual(unknown);

        await suite.dataSource.getRepository(RealmEntity).delete({ id: entity.id });
    });

    it('never reaches a realm NAMED like the realm id a lookup names', async () => {
        const impostor = await suite.dataSource.getRepository(RealmEntity).save({ name: realm.id });
        const name = `impostor-${randomUUID()}`;
        const client = await suite.dataSource.getRepository(ClientEntity).save({
            ...createFakeClient(),
            name,
            realmId: impostor.id,
        });
        const user = await suite.dataSource.getRepository(UserEntity).save({
            ...createFakeUser(),
            name,
            realmId: impostor.id,
        });

        await expect(clients.findOneByName(name, realm.id)).resolves.toBeNull();
        await expect(users.findOneByName(name, realm.id)).resolves.toBeNull();
        await expect(oauth2Clients.findOneByIdOrName(name, realm.id)).resolves.toBeNull();

        expect((await clients.findOneByName(name, impostor.id))?.id).toEqual(client.id);
        expect((await users.findOneByName(name, impostor.id))?.id).toEqual(user.id);

        await suite.dataSource.getRepository(UserEntity).delete({ id: user.id });
        await suite.dataSource.getRepository(ClientEntity).delete({ id: client.id });
        await suite.dataSource.getRepository(RealmEntity).delete({ id: impostor.id });
    });
});
