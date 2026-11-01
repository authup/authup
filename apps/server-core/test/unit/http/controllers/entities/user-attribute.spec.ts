/*
 * Copyright (c) 2022-2024.
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
import { RealmScope } from '@authup/access';
import type { User, UserAttribute } from '@authup/core-kit';
import { PermissionName, REALM_MASTER_NAME } from '@authup/core-kit';
import { createTestApplication } from '../../../../app';
import { createFakeUser, createFakeUserAttribute, httpRequest } from '../../../../utils';

describe('src/http/controllers/user-attribute', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should create, read, update, delete resource', async () => {
        const attribute = createFakeUserAttribute();
        const { data: response } = await suite.client.userAttribute.create(attribute);

        expect(response.name).toEqual(attribute.name);
        expect(response.value).toEqual(attribute.value);
    });

    // #3671: a numeric-looking string reads back as a string on every surface
    it('keeps a numeric-looking value a string', async () => {
        const name = `numeric_${Date.now()}`;
        const { data: created } = await suite.client.userAttribute.create({ name, value: '123' });

        const { data: read } = await suite.client.userAttribute.getOne(created.id);

        expect(read.value).toBe('123');

        const { data: user } = await suite.client.user.getOne(created.userId);

        expect((user as Record<string, any>)[name]).toBe('123');

        const userInfo = await suite.client.userInfo.get<Record<string, any>>();

        expect(userInfo[name]).toBe('123');

        await suite.client.userAttribute.delete(created.id);
    });

    /**
     * Naming the owner through the `user` relation keeps working, but only its
     * id is taken: the object is dropped before anything reads it, since its
     * `realmId` would otherwise gate USER_UPDATE against a realm of the
     * caller's choosing. Ignoring it outright leaves no target at all, turns
     * the self-target branch true and writes the row onto the CALLER with a
     * 201 -- an owner silently swapped for another.
     */
    it('creates for the user a body names through the relation, not for the caller', async () => {
        const { data: target } = await suite.client.user.create(createFakeUser());
        const name = `owner_probe_${Date.now()}`;

        const response = await httpRequest(suite, 'POST', '/user-attributes', {
            headers: {
                Authorization: `Basic ${Buffer.from('admin:start123').toBase64()}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                user: { id: target.id },
                name,
                value: 'dark',
            }),
        });

        expect(response.status).toEqual(201);

        const { data: rows } = await suite.client.userAttribute.getMany({ filters: { name } });

        expect(rows).toHaveLength(1);
        expect(rows[0].userId).toEqual(target.id);
        expect(rows[0].realmId).toEqual(target.realmId);
    });

    it('creates for another user when the owner is named by userId', async () => {
        const { data: target } = await suite.client.user.create(createFakeUser());
        const attribute = createFakeUserAttribute();

        const { data: response } = await suite.client.userAttribute.create({
            ...attribute,
            userId: target.id,
        });

        expect(response.userId).toEqual(target.id);
        expect(response.realmId).toEqual(target.realmId);
    });

    describe('a body id (self-manage bearer)', () => {
        const password = 'user-attribute-self-password-123';

        let self: User;
        let token: string;
        let foreign: UserAttribute;

        async function send(path: string, body: Record<string, any>) {
            return httpRequest(suite, 'POST', path, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
        }

        async function expectForeignUntouched() {
            const { data } = await suite.client.userAttribute.getOne(foreign.id);

            expect(data).toMatchObject({
                userId: foreign.userId,
                realmId: foreign.realmId,
                name: foreign.name,
                value: foreign.value,
            });
        }

        beforeAll(async () => {
            const { data: created } = await suite.client.user.create({
                ...createFakeUser(),
                password,
                active: true,
            });

            self = created;

            const { data: permission } = await suite.client.permission.getOne(PermissionName.USER_SELF_MANAGE);

            await suite.client.userPermission.create({
                userId: self.id,
                permissionId: permission.id,
                realmScope: RealmScope.OWN,
            });

            const response = await suite.client.token.createWithPassword({
                username: self.name,
                password,
                realm_name: REALM_MASTER_NAME,
            });

            token = response.access_token;

            const { data: other } = await suite.client.user.create(createFakeUser());
            const { data } = await suite.client.userAttribute.create({
                userId: other.id,
                name: `foreign_${Date.now()}`,
                value: 'foreign-value',
            });

            foreign = data;
        });

        it('never retargets a create onto another row', async () => {
            const response = await send('/user-attributes', {
                id: foreign.id,
                name: `created_with_id_${Date.now()}`,
                value: 'v',
            });

            expect(response.status).toEqual(201);

            const body = await response.json();

            expect(body.data.id).not.toEqual(foreign.id);
            expect(body.data.userId).toEqual(self.id);

            await expectForeignUntouched();
        });

        it('never retargets an update onto another row', async () => {
            const created = await send('/user-attributes', {
                name: `own_${Date.now()}`,
                value: 'v',
            });

            expect(created.status).toEqual(201);

            const { data: own } = await created.json();

            const response = await send(`/user-attributes/${own.id}`, {
                id: foreign.id,
                name: `renamed_${Date.now()}`,
                value: 'overwritten',
            });

            expect(response.status).toEqual(202);

            const body = await response.json();

            expect(body.data.id).toEqual(own.id);
            expect(body.data.userId).toEqual(self.id);

            await expectForeignUntouched();
        });

        it('refuses a name that is a relation of the user', async () => {
            const response = await send('/user-attributes', {
                name: 'realm',
                value: 'shadowed',
            });

            expect(response.status).toEqual(400);
        });

        it('refuses a name that is not a string', async () => {
            const response = await send('/user-attributes', {
                name: ['email'],
                value: 'attacker@example.com',
            });

            expect(response.status).toEqual(400);

            const { data: user } = await suite.client.user.getOne(self.id);

            expect((user as Record<string, any>).email).not.toEqual('attacker@example.com');
        });
    });
});
