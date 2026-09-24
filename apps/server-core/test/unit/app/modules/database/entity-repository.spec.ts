/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Realm } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { isEntityConflictError } from '@authup/errors';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    PolicyEntity,
    PolicyRepository,
    RealmEntity,
    RoleEntity,
    UserAttributeEntity,
    UserEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../../../src/adapters/database/domains/index.ts';
import { decodeQuery } from '../../../../../src/core/query/index.ts';
import {
    PolicyRepositoryAdapter,
    RoleRepositoryAdapter,
    UserAttributeRepositoryAdapter,
    UserRepositoryAdapter,
    UserRoleRepositoryAdapter,
} from '../../../../../src/app/modules/database/repositories/index.ts';
import { createTestDatabaseApplication } from '../../../../app';

describe('app/modules/database/repositories/entity', () => {
    const suite = createTestDatabaseApplication();

    let realm : Realm;
    let policies : PolicyRepositoryAdapter;

    let roles : RoleRepositoryAdapter;
    let users : UserRepositoryAdapter;
    let userRoles : UserRoleRepositoryAdapter;
    let userAttributes : UserAttributeRepositoryAdapter;

    const created : { target: any, id: string }[] = [];

    beforeAll(async () => {
        await suite.setup();

        const { dataSource } = suite;
        realm = (await dataSource.getRepository(RealmEntity).findOneBy({ name: 'master' }))!;

        roles = new RoleRepositoryAdapter({
            repository: dataSource.getRepository(RoleEntity),
            realmRepository: dataSource.getRepository(RealmEntity),
        });
        policies = new PolicyRepositoryAdapter({
            repository: new PolicyRepository(dataSource),
            realmRepository: dataSource.getRepository(RealmEntity),
        });
        users = new UserRepositoryAdapter({
            repository: new UserRepository(dataSource),
            realmRepository: dataSource.getRepository(RealmEntity),
        });
        userRoles = new UserRoleRepositoryAdapter(dataSource.getRepository(UserRoleEntity));
        userAttributes = new UserAttributeRepositoryAdapter(dataSource.getRepository(UserAttributeEntity));
    });

    afterAll(async () => {
        for (const entry of created.reverse()) {
            await suite.dataSource.getRepository(entry.target).delete({ id: entry.id });
        }

        await suite.teardown();
    });

    async function createRole() {
        const role = await roles.save(roles.create({ name: `role-${randomUUID()}`, realmId: realm.id }));
        created.push({ target: RoleEntity, id: role.id });
        return role;
    }

    async function createUser() {
        const name = `user-${randomUUID()}`;
        const user = await users.save(users.create({
            name, 
            email: `${name}@example.com`, 
            realmId: realm.id, 
        }));
        created.push({ target: UserEntity, id: user.id });
        return user;
    }

    describe('lookups', () => {
        it('should find a row by id, by name and by name within a realm', async () => {
            const role = await createRole();

            expect((await roles.findOneByIdOrName(role.id))?.id).toEqual(role.id);
            expect((await roles.findOneByIdOrName(role.name))?.id).toEqual(role.id);
            expect((await roles.findOneByIdOrName(role.name, realm.id))?.id).toEqual(role.id);
            expect((await roles.findOneByIdOrName(role.name, realm.name))?.id).toEqual(role.id);
        });

        it('should match nothing within a realm key that resolves to no realm', async () => {
            const role = await createRole();

            await expect(roles.findOneByName(role.name, randomUUID())).resolves.toBeNull();
            await expect(roles.findOneByName(role.name, 'no-such-realm')).resolves.toBeNull();
        });

        it('should answer null for a non-uuid id without querying', async () => {
            await expect(roles.findOneById('not-a-uuid')).resolves.toBeNull();
            await expect(roles.findOneBy({ id: 'not-a-uuid' })).resolves.toBeNull();
        });

        it('should give an entity without names no name lookup', async () => {
            const role = await createRole();
            const user = await createUser();
            const userRole = await userRoles.save(userRoles.create({
                userId: user.id,
                userRealmId: realm.id,
                roleId: role.id,
                roleRealmId: realm.id,
            }));
            created.push({ target: UserRoleEntity, id: userRole.id });

            await expect(userRoles.findOneByName('anything')).resolves.toBeNull();
            expect((await userRoles.findOneByIdOrName(userRole.id))?.id).toEqual(userRole.id);
        });
    });

    describe('realm scope columns', () => {
        it('should keep realmId under a projection that leaves it out', async () => {
            const role = await createRole();

            const query = await decodeQuery(
                { fields: ['name'], filter: { id: role.id } },
                { schema: EntityType.ROLE },
            );
            const { data } = await roles.findMany(query);

            expect(data).toHaveLength(1);
            expect(data[0].realmId).toEqual(realm.id);
        });

        it('should keep the owner realm key of a junction and the extra columns of a user', async () => {
            const role = await createRole();
            const user = await createUser();
            const userRole = await userRoles.save(userRoles.create({
                userId: user.id,
                userRealmId: realm.id,
                roleId: role.id,
                roleRealmId: realm.id,
            }));
            created.push({ target: UserRoleEntity, id: userRole.id });

            const junction = await userRoles.findMany(await decodeQuery(
                { fields: ['roleId'], filter: { id: userRole.id } },
                { schema: EntityType.USER_ROLE },
            ));
            expect(junction.data[0].userRealmId).toEqual(realm.id);

            const self = await users.findMany(await decodeQuery(
                { fields: ['name'], filter: { id: user.id } },
                { schema: EntityType.USER },
            ));
            expect(self.data[0].id).toEqual(user.id);
            expect(self.data[0].realmId).toEqual(realm.id);
        });
    });

    describe('extra attributes', () => {
        it('should extend reads that answer a caller, never the read a write loads through', async () => {
            const user = await createUser();
            const attribute = await userAttributes.save(userAttributes.create({
                name: 'favoriteColor',
                value: 'green',
                userId: user.id,
                realmId: realm.id,
            }));
            created.push({ target: UserAttributeEntity, id: attribute.id });

            const byId = await users.findOneById(user.id) as Record<string, any>;
            const byName = await users.findOneByName(user.name, realm.id) as Record<string, any>;
            const list = await users.findMany(await decodeQuery(
                { filter: { id: user.id } },
                { schema: EntityType.USER },
            ));

            expect(byId.favoriteColor).toEqual('green');
            expect(byName.favoriteColor).toEqual('green');
            expect((list.data[0] as Record<string, any>).favoriteColor).toEqual('green');

            const forWrite = await users.findOneBy({ id: user.id }) as Record<string, any>;
            expect(forWrite.favoriteColor).toBeUndefined();
        });
    });

    describe('writes', () => {
        it('should answer a duplicate key on save with a conflict', async () => {
            // a user, since its unique key holds no nullable column: a role's
            // includes `client_id`, and a unique index treats NULLs as distinct
            const user = await createUser();

            const error = await users.save(users.create({
                name: user.name,
                email: `${randomUUID()}@example.com`,
                realmId: realm.id,
            })).then(() => undefined, (e) => e);

            expect(isEntityConflictError(error)).toBeTruthy();
            expect(error.message).toEqual('The user already exists.');
        });

        it('should answer a duplicate key on an extra-attribute write with a conflict', async () => {
            const name = `policy-${randomUUID()}`;
            const policy = await policies.saveWithEA(policies.create({
                name,
                type: 'time',
                realmId: realm.id,
            }), { start: '08:00', end: '16:00' });
            created.push({ target: PolicyEntity, id: policy.id });

            const error = await policies.saveWithEA(policies.create({
                name,
                type: 'time',
                realmId: realm.id,
            }), { start: '08:00', end: '16:00' }).then(() => undefined, (e) => e);

            expect(isEntityConflictError(error)).toBeTruthy();
            expect(error.message).toEqual('The policy already exists.');
        });

        it('should report a taken name through checkUniqueness', async () => {
            const role = await createRole();

            const error = await roles.checkUniqueness({ name: role.name, realmId: realm.id })
                .then(() => undefined, (e) => e);
            expect(isEntityConflictError(error)).toBeTruthy();
            expect(error.message).toEqual('The role already exists.');
            await expect(roles.checkUniqueness({ name: role.name, realmId: realm.id }, role))
                .resolves.toBeUndefined();
        });

        it('should refuse a join column that references no row', async () => {
            await expect(userRoles.validateJoinColumns({ userId: randomUUID(), roleId: randomUUID() }))
                .rejects.toThrow();
            await expect(userAttributes.validateJoinColumns({ userId: 'not-a-uuid' }))
                .rejects.toThrow();
        });
    });
});
