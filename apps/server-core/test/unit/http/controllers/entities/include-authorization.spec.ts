/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
    createFakeClient,
    createFakePermission,
    createFakeRole,
    createFakeUser,
} from '../../../../utils';

describe('http/controllers (include authorization)', () => {
    const suite = createTestApplication();

    let readerClient: HTTPClient;
    let roleReaderClient: HTTPClient;
    const knownSecret = 'include-gate-secret';

    const createIdentity = async (permissionNames: PermissionName[]) => {
        const created = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: knownSecret,
            secretHashed: false,
            secretEncrypted: false,
        });

        for (const permissionName of permissionNames) {
            const permission = await suite.client.permission.getOne(permissionName);
            await suite.client.clientPermission.create({
                clientId: created.id,
                permissionId: permission.id,
            });
        }

        const tokenResponse = await suite.client.token.createWithClientCredentials({
            client_id: created.id,
            client_secret: knownSecret,
        });

        const httpClient = new HTTPClient({ baseURL: suite.baseURL });
        httpClient.setAuthorizationHeader({
            type: 'Bearer',
            token: tokenResponse.access_token,
        });

        return httpClient;
    };

    beforeAll(async () => {
        await suite.setup();

        readerClient = await createIdentity([
            PermissionName.USER_ROLE_READ,
        ]);
        roleReaderClient = await createIdentity([
            PermissionName.USER_ROLE_READ,
            PermissionName.ROLE_READ,
        ]);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should join includes for an actor holding the target read permissions', async () => {
        const response = await suite.client.userRole.getMany({ relations: ['user', 'role'] });

        expect(response.data.length).toBeGreaterThanOrEqual(1);
        expect(response.data[0].user).toBeDefined();
        expect(response.data[0].role).toBeDefined();
    });

    it('should strip includes for an actor without the target read permissions', async () => {
        const response = await readerClient.userRole.getMany({ relations: ['user', 'role'] });

        // fail-soft: the list itself succeeds, only the joins are dropped
        expect(response.data.length).toBeGreaterThanOrEqual(1);
        for (const row of response.data) {
            expect(row.user).toBeUndefined();
            expect(row.role).toBeUndefined();
            expect(row.userId).toBeDefined();
            expect(row.roleId).toBeDefined();
        }
    });

    it('should strip only the includes whose target read gate settles false', async () => {
        const response = await roleReaderClient.userRole.getMany({ relations: ['user', 'role'] });

        expect(response.data.length).toBeGreaterThanOrEqual(1);
        for (const row of response.data) {
            expect(row.user).toBeUndefined();
            expect(row.role).toBeDefined();
        }
    });

    // regression: #3313 — permissionSchema had no fields projection, so
    // include=permission was silently stripped on the permission-binding
    // collections even for an actor holding PERMISSION_READ.
    it('should join include=permission on client-permission for a permitted actor', async () => {
        const permission = await suite.client.permission.create(createFakePermission());
        const client = await suite.client.client.create(createFakeClient());
        await suite.client.clientPermission.create({
            clientId: client.id,
            permissionId: permission.id,
        });

        const response = await suite.client.clientPermission.getMany({
            relations: ['permission'],
            filters: { clientId: client.id },
        });

        const row = response.data.find((r) => r.clientId === client.id);
        expect(row).toBeDefined();
        expect(row!.permission).toBeDefined();
        expect(row!.permission!.name).toEqual(permission.name);
    });

    it('should join include=permission on user-permission for a permitted actor', async () => {
        const permission = await suite.client.permission.create(createFakePermission());
        const user = await suite.client.user.create(createFakeUser());
        await suite.client.userPermission.create({
            userId: user.id,
            permissionId: permission.id,
        });

        const response = await suite.client.userPermission.getMany({
            relations: ['permission'],
            filters: { userId: user.id },
        });

        const row = response.data.find((r) => r.userId === user.id);
        expect(row).toBeDefined();
        expect(row!.permission).toBeDefined();
        expect(row!.permission!.name).toEqual(permission.name);
    });

    it('should join include=permission on role-permission for a permitted actor', async () => {
        const permission = await suite.client.permission.create(createFakePermission());
        const role = await suite.client.role.create(createFakeRole());
        await suite.client.rolePermission.create({
            roleId: role.id,
            permissionId: permission.id,
        });

        const response = await suite.client.rolePermission.getMany({
            relations: ['permission'],
            filters: { roleId: role.id },
        });

        const row = response.data.find((r) => r.roleId === role.id);
        expect(row).toBeDefined();
        expect(row!.permission).toBeDefined();
        expect(row!.permission!.name).toEqual(permission.name);
    });
});
