/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client as ClientEntity,
    Permission,
    Realm,
    Role,
    User,
} from '@authup/core-kit';
import { PermissionName, ROLE_CLIENT_ADMIN_NAME } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app/index.ts';
import {
    createFakeClient,
    createFakePermission,
    createFakeRealm,
    createFakeRole,
    createFakeUser,
    expectClientError,
} from '../../../../utils/index.ts';
import { createFakeTimePolicy } from '../../../../utils/domains/policy.ts';

describe('http/controllers/client-admin', () => {
    const suite = createTestApplication();

    const secret = 'client-admin-secret';

    let r1: Realm;
    let r2: Realm;
    let c1: ClientEntity;
    let c2: ClientEntity;
    let u1: User;
    let u2: User;
    let clientAdmin: Role;

    let c1Client: HTTPClient;

    let p: Permission;
    let role: Role;

    beforeAll(async () => {
        await suite.setup();

        ({ data: r1 } = await suite.client.realm.create(createFakeRealm()));
        ({ data: r2 } = await suite.client.realm.create(createFakeRealm()));

        ({ data: c1 } = await suite.client.client.create({
            ...createFakeClient(),
            realmId: r1.id,
            secret,
            secretHashed: false,
            secretEncrypted: false,
        }));
        ({ data: c2 } = await suite.client.client.create({
            ...createFakeClient(),
            realmId: r1.id,
        }));

        ({ data: u1 } = await suite.client.user.create(createFakeUser({ realmId: r1.id })));
        ({ data: u2 } = await suite.client.user.create(createFakeUser({ realmId: r2.id })));

        ({ data: clientAdmin } = await suite.client.role.getOne(ROLE_CLIENT_ADMIN_NAME));

        await suite.client.clientRole.create({ clientId: c1.id, roleId: clientAdmin.id });

        const token = await suite.client.token.createWithClientCredentials({
            client_id: c1.id,
            client_secret: secret,
        });

        c1Client = new HTTPClient({ baseURL: suite.baseURL });
        c1Client.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should create a permission and a role owned by itself', async () => {
        ({ data: p } = await c1Client.permission.create(createFakePermission({ realmId: r1.id, clientId: c1.id })));
        expect(p.clientId).toEqual(c1.id);
        expect(p.realmId).toEqual(r1.id);

        ({ data: role } = await c1Client.role.create(createFakeRole({ realmId: r1.id, clientId: c1.id })));
        expect(role.clientId).toEqual(c1.id);
    });

    it('should bind its permission into its role', async () => {
        const { data } = await c1Client.rolePermission.create({ roleId: role.id, permissionId: p.id });

        expect(data.roleId).toEqual(role.id);
        expect(data.permissionId).toEqual(p.id);
    });

    it('should assign its role and its permission to a user of its realm', async () => {
        const { data: userRole } = await c1Client.userRole.create({ userId: u1.id, roleId: role.id });

        expect(userRole.userId).toEqual(u1.id);

        const { data: userPermission } = await c1Client.userPermission.create({ userId: u1.id, permissionId: p.id });

        expect(userPermission.permissionId).toEqual(p.id);
    });

    it('should attach a policy to its permission', async () => {
        const { data: policy } = await suite.client.policy.create(createFakeTimePolicy({ realmId: r1.id }));

        const { data } = await c1Client.permissionPolicy.create({ permissionId: p.id, policyId: policy.id });

        expect(data.policyId).toEqual(policy.id);
    });

    it('should list only its own permissions, roles and user roles', async () => {
        await suite.client.permission.create(createFakePermission({ realmId: r1.id, clientId: c2.id }));

        const { data: foreign } = await suite.client.role.create(createFakeRole({ realmId: r1.id, clientId: c2.id }));

        await suite.client.userRole.create({ userId: u1.id, roleId: foreign.id });

        const { data: permissions } = await c1Client.permission.getMany();

        expect(permissions.length).toBeGreaterThan(0);
        expect(permissions.every((entity) => entity.clientId === c1.id)).toBe(true);
        expect(permissions.map((entity) => entity.id)).toContain(p.id);

        const { data: roles } = await c1Client.role.getMany();

        expect(roles.length).toBeGreaterThan(0);
        expect(roles.every((entity) => entity.clientId === c1.id)).toBe(true);

        // a user-role list is evaluated per row after paging, so the shared
        // server databases need the filter to keep both rows on one page
        const { data: userRoles } = await c1Client.userRole.getMany({ filters: { userId: u1.id } });

        expect(userRoles.map((entity) => entity.roleId)).toEqual([role.id]);
    });

    it('should list only its own permissions through a field projection', async () => {
        const { data: permissions } = await c1Client.permission.getMany({ fields: ['name'] });

        expect(permissions.map((entity) => entity.name)).toEqual([p.name]);
    });

    it('should refuse a permission owned by another client', async () => {
        await expectClientError(
            () => c1Client.permission.create(createFakePermission({ realmId: r1.id, clientId: c2.id })),
            { status: 403 },
        );
    });

    it('should refuse to update a global permission', async () => {
        const { data: global } = await suite.client.permission.getOne(PermissionName.USER_READ);

        await expectClientError(
            () => c1Client.permission.update(global.id, { description: 'hijacked' }),
            { status: 403 },
        );
    });

    it('should refuse to bind into a role of another client', async () => {
        const { data: foreign } = await suite.client.role.create(createFakeRole({ realmId: r1.id, clientId: c2.id }));

        await expectClientError(
            () => c1Client.rolePermission.create({ roleId: foreign.id, permissionId: p.id }),
            { status: 403 },
        );
    });

    it('should refuse to assign to a user of another realm', async () => {
        await expectClientError(
            () => c1Client.userRole.create({ userId: u2.id, roleId: role.id }),
            { status: 403 },
        );
    });

    it('should grant a user holding client_admin nothing', async () => {
        const password = 'client-admin-user-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ realmId: r1.id, password }));

        await suite.client.userRole.create({ userId: user.id, roleId: clientAdmin.id });

        const token = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: r1.id,
        });

        const userClient = new HTTPClient({ baseURL: suite.baseURL });

        userClient.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

        await expectClientError(
            () => userClient.permission.create(createFakePermission({ realmId: r1.id, clientId: c1.id })),
            { status: 403 },
        );
        await expectClientError(
            () => userClient.permission.create(createFakePermission({ realmId: r1.id })),
            { status: 403 },
        );
    });
});
