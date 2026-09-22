/*
 * Copyright (c) 2021-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { User } from '@authup/core-kit';
import { PermissionName, REALM_MASTER_NAME } from '@authup/core-kit';
import type { UserCreatePayload } from '@authup/core-http-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { createTestApplication } from '../../../../app';
import {
    createFakeRealm,
    createFakeUser,
    expectClientError,
    expectPropertiesEqualToSrc,
} from '../../../../utils';

describe('src/http/controllers/user', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const details: UserCreatePayload & { id?: User['id'] } = createFakeUser();

    it('should create resource', async () => {
        const { data: response } = await suite.client
            .user
            .create(details);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response, ['password']);

        details.id = response.id;
    });

    it('should read collection', async () => {
        const response = await suite.client
            .user
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should read collection with realm include', async () => {
        const response = await suite.client
            .user
            .getMany({ relations: ['realm'] });

        expect(response.data.length).toBeGreaterThanOrEqual(2);
        expect(response.data[0].realm).toBeDefined();
    });

    it('should read collection with fields projection and realm include', async () => {
        const response = await suite.client
            .user
            .getMany({
                fields: ['id', 'name'],
                relations: ['realm'],
            });

        expect(response.data.length).toBeGreaterThanOrEqual(2);
        expect(response.data[0].realm).toBeDefined();
    });

    it('should read resource', async () => {
        const { data: response } = await suite.client
            .user
            .getOne(details.id!, { fields: ['+email'] });

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response, ['password']);
    });

    it('should read resource by name', async () => {
        const { data: response } = await suite.client
            .user
            .getOne(details.name, { fields: ['+email'] });

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response, ['password']);
    });

    it('should update resource', async () => {
        details.name = 'testa';
        details.firstName = 'bar';
        details.lastName = 'baz';

        const { data: response } = await suite.client
            .user
            .update(details.id!, details);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response, ['password', 'realm' as any]);
    });

    it('should delete resource', async () => {
        const { data: response } = await suite.client
            .user
            .delete(details.id!);

        expect(response.id).toBeDefined();
    });

    it('should create and update resource with put', async () => {
        const entity = createFakeUser();
        let { data: response } = await suite.client
            .user.createOrUpdate(entity.name, entity);

        expect(response).toBeDefined();
        expect(response.name).toEqual(entity.name);

        const { id } = response;

        const { name } = createFakeUser();

        response = (await suite.client
            .user
            .createOrUpdate(entity.name, {
                ...entity,
                name,
            })).data;

        expect(response.name).toEqual(name);
        expect(response.id).toEqual(id);
    });

    it('should not create with put when the key is an unknown id', async () => {
        await expectClientError(
            () => suite.client.user.createOrUpdate(randomUUID(), createFakeUser()),
            {
                status: 404,
                code: ErrorCode.ENTITY_NOT_FOUND,
            },
        );
    });

    // A user never moves between realms. The realm-scoped lookup in save()
    // misses on a foreign realm, and the upsert must NOT fall through to its
    // create branch: that would write a second user (a fresh id, same name)
    // into the target realm, which reads like a move in the realm-scoped UI.
    it('should not create a copy with put when the realm does not match', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const { data: user } = await suite.client.user.create(createFakeUser());

        await expectClientError(
            () => suite.client.user.createOrUpdate(user.id, {
                name: user.name,
                email: user.email,
                realmId: realm.id,
            }),
            {
                status: 404,
                code: ErrorCode.ENTITY_NOT_FOUND,
            },
        );

        const { data: rows } = await suite.client.user.getMany({
            filters: { name: user.name },
            fields: ['id', 'name', 'realmId'],
        });

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toEqual(user.id);
        expect(rows[0].realmId).toEqual(user.realmId);

        await suite.client.user.delete(user.id);
        await suite.client.realm.delete(realm.id);
    });

    // Filing yourself into another folder is admin state, so `pathId` is on
    // the `system.user-names-self-manage` denylist like `realmId`.
    it('should reject a self-update of path_id', async () => {
        const knownPassword = 'self-manage-password-123';
        const { data: user } = await suite.client.user.create({
            ...createFakeUser(),
            password: knownPassword,
            active: true,
        });

        const { data: permission } = await suite.client.permission.getOne(PermissionName.USER_SELF_MANAGE);
        await suite.client.userPermission.create({
            userId: user.id,
            permissionId: permission.id,
        });

        const tokenResponse = await suite.client.token.createWithPassword({
            username: user.name,
            password: knownPassword,
            realm_name: REALM_MASTER_NAME,
        });

        const selfClient = new HTTPClient({ baseURL: suite.baseURL });
        selfClient.setAuthorizationHeader({
            type: 'Bearer',
            token: tokenResponse.access_token,
        });

        // a real folder in the user's own realm, so the rejection can only
        // come from the denylist: neither the join-column check nor the realm
        // assert has anything to complain about
        const { data: path } = await suite.client.path.create({
            name: 'self-manage-user',
            realmId: user.realmId,
        });

        await expectClientError(
            () => selfClient.user.update(user.id, { pathId: path.id }),
            {
                // the denylist refusal is the policy evaluation failing, not
                // an input error: a bare rejects.toThrow() would pass on a 500
                status: 403,
                code: ErrorCode.PERMISSION_EVALUATION_FAILED,
            },
        );

        const { data: current } = await suite.client.user.getOne(user.id);
        expect(current.pathId).toBeNull();
    });
});
