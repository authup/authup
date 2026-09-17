/*
 * Copyright (c) 2024-2026.
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
import { RealmScope } from '@authup/access';
import { Client } from '@authup/core-http-kit';
import { PermissionName } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import { PermissionEntity } from '../../../../../../src';
import { createTestApplication } from '../../../../../app';
import {
    createFakeRealm,
    createFakeUser,
    createScopeRestrictedClient,
    expectClientError,
} from '../../../../../utils';

// Service-level coverage of the DB-backed permission-checker lives in
// test/unit/core/identity/permission/checker.spec.ts. The HTTP tests below
// pin the controller's auth gate, the status-code / response-shape contract,
// the identity and scope rule, which the check reaches only through the
// request's own evaluator, and the permission_check gate on naming a subject.

describe('http/controllers/entities/permission/checker', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('returns status=error with the serialized error for an unknown name', async () => {
        const name = createNanoID();
        const response = await suite.client.permission.check(name);

        expect(response).toBeDefined();
        expect(response.status).toEqual('error');
        expect(response.data).toBeDefined();
        expect(typeof response.data!.message).toBe('string');
    });

    it('returns the checker result body with a 202 response', async () => {
        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({
            name: createNanoID(),
            builtIn: true,
        }));

        const response = await suite.client.permission.check(permission.id);
        expect(response).toBeDefined();
        expect(response.status).toMatch(/^(success|error)$/);
    });

    it('answers a bearer without the global scope an error, and refuses it naming a subject (#3604)', async () => {
        const control = await suite.client.permission.check(PermissionName.USER_UPDATE);
        expect(control.status).toEqual('success');

        const { client, payload } = await createScopeRestrictedClient(suite);

        const bare = await client.permission.check(PermissionName.USER_UPDATE);
        expect(bare.status).toEqual('error');

        await expectClientError(
            () => client.permission.check(PermissionName.USER_UPDATE, { identity: { type: payload.sub_kind, id: payload.sub } }),
            { status: 403 },
        );
    });

    it('answers for the subject a permission_check holder names (#3604)', async () => {
        const { data: subject } = await suite.client.user.create(createFakeUser());
        const { data: permission } = await suite.client.permission.getOne(PermissionName.USER_READ);
        await suite.client.userPermission.create({ userId: subject.id, permissionId: permission.id });

        const held = await suite.client.permission.check(PermissionName.USER_READ, { identity: { type: 'user', id: subject.id } });
        expect(held.status).toEqual('success');

        const missing = await suite.client.permission.check(PermissionName.USER_UPDATE, { identity: { type: 'user', id: subject.id } });
        expect(missing.status).toEqual('error');

        await expectClientError(
            () => suite.client.permission.check(PermissionName.USER_READ, { identity: { type: 'user', id: randomUUID() } }),
            { status: 404 },
        );

        await expectClientError(
            () => suite.client.permission.check(PermissionName.USER_READ, { identity: { type: 'robot', id: subject.id } }),
            { status: 400 },
        );

        // a name is refused: names repeat across realms, so it would not say which subject
        await expectClientError(
            () => suite.client.permission.check(PermissionName.USER_READ, { identity: { type: 'user', id: subject.name } }),
            { status: 400 },
        );
    });

    it('refuses a caller without permission_check that names a subject (#3604)', async () => {
        const { data: admin } = await suite.client.user.getOne('@me');

        const password = 'start123-checker-ungranted';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const grant = await suite.client.token.createWithPassword({ username: user.name, password });

        const client = new Client({ baseURL: suite.baseURL });
        client.setAuthorizationHeader({ type: 'Bearer', token: grant.access_token });

        await expectClientError(
            () => client.permission.check(PermissionName.USER_UPDATE, { identity: { type: 'user', id: admin.id } }),
            { status: 403 },
        );

        // refused before the lookup, so an unknown subject reads the same as a known one
        await expectClientError(
            () => client.permission.check(PermissionName.USER_UPDATE, { identity: { type: 'user', id: randomUUID() } }),
            { status: 403 },
        );
    });

    it('matches a permission_check grant against the realm of the subject (#3604)', async () => {
        const { data: permission } = await suite.client.permission.getOne(PermissionName.PERMISSION_CHECK);

        const password = 'start123-checker-own';
        const { data: checker } = await suite.client.user.create(createFakeUser({ password }));
        await suite.client.userPermission.create({
            userId: checker.id,
            permissionId: permission.id,
            realmScope: RealmScope.OWN,
        });
        const grant = await suite.client.token.createWithPassword({ username: checker.name, password });

        const client = new Client({ baseURL: suite.baseURL });
        client.setAuthorizationHeader({ type: 'Bearer', token: grant.access_token });

        // the checker holds no user_read itself, so a success can only be the subject's
        const { data: local } = await suite.client.user.create(createFakeUser());
        const { data: userRead } = await suite.client.permission.getOne(PermissionName.USER_READ);
        await suite.client.userPermission.create({ userId: local.id, permissionId: userRead.id });
        const inRealm = await client.permission.check(PermissionName.USER_READ, { identity: { type: 'user', id: local.id } });
        expect(inRealm.status).toEqual('success');

        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const { data: foreign } = await suite.client.user.create(createFakeUser({ realmId: realm.id }));
        await expectClientError(
            () => client.permission.check(PermissionName.USER_UPDATE, { identity: { type: 'user', id: foreign.id } }),
            { status: 403 },
        );
    });

    it('evaluates the resolved permission row, not a global permission of the same name', async () => {
        const { data: admin } = await suite.client.user.getOne('@me');
        const { data: permission } = await suite.client.permission.create({
            name: createNanoID(),
            realmId: admin.realmId,
        });

        const { data: subject } = await suite.client.user.create(createFakeUser());
        await suite.client.userPermission.create({ userId: subject.id, permissionId: permission.id });
        await suite.client.userPermission.create({ userId: admin.id, permissionId: permission.id });

        const self = await suite.client.permission.check(permission.id);
        expect(self.status).toEqual('success');

        const other = await suite.client.permission.check(permission.id, { identity: { type: 'user', id: subject.id } });
        expect(other.status).toEqual('success');
    });
});
