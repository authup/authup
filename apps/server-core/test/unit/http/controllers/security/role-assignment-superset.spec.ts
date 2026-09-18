/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
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
    createFakeOAuth2IdentityProvider,
    createFakeRole,
    createFakeUser,
    httpRequest,
} from '../../../../utils';

describe('http/controllers/security (role assignment superset #3607)', () => {
    const suite = createTestApplication();

    beforeAll(() => suite.setup());
    afterAll(() => suite.teardown());

    describe.each([false, true])('client-owned role: %s', (owned) => {
        it.each([
            ['user-role create', PermissionName.USER_ROLE_CREATE],
            ['client-role create', PermissionName.CLIENT_ROLE_CREATE],
            ['provider-role create', PermissionName.IDENTITY_PROVIDER_ROLE_CREATE],
            ['provider-role update', PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE],
        ])('%s requires the role\'s global permissions', async (operation, assignmentPermission) => {
            const password = 'role-assignment-password-123';
            const { data: user } = await suite.client.user.create(createFakeUser({ password }));
            const { data: client } = await suite.client.client.create(createFakeClient());
            const { data: role } = await suite.client.role.create(createFakeRole({ clientId: owned ? client.id : null }));
            const { data: userDelete } = await suite.client.permission.getOne(PermissionName.USER_DELETE);
            await suite.client.rolePermission.create({ roleId: role.id, permissionId: userDelete.id });

            const { data: permission } = await suite.client.permission.getOne(assignmentPermission);
            await suite.client.userPermission.create({ userId: user.id, permissionId: permission.id });
            const token = await suite.client.token.createWithPassword({ username: user.name, password });

            let path: string;
            let body: Record<string, string>;
            if (operation === 'user-role create') {
                path = '/user-roles';
                body = { userId: user.id, roleId: role.id };
            } else if (operation === 'client-role create') {
                path = '/client-roles';
                body = { clientId: client.id, roleId: role.id };
            } else {
                const { data: provider } = await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider());
                path = '/identity-provider-role-mappings';
                body = { providerId: provider.id, roleId: role.id };
                if (operation === 'provider-role update') {
                    const { data: mapping } = await suite.client.identityProviderRoleMapping.create({
                        providerId: provider.id,
                        roleId: role.id,
                    });
                    path += `/${mapping.id}`;
                    body = { name: 'updated' };
                }
            }

            const assign = () => httpRequest(suite, 'POST', path, {
                headers: {
                    authorization: `Bearer ${token.access_token}`,
                    'content-type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const denied = await assign();
            expect(denied.status).toBe(403);
            expect(await denied.json()).toMatchObject({ code: ErrorCode.PERMISSION_DENIED });

            await suite.client.userPermission.create({ userId: user.id, permissionId: userDelete.id });
            const allowed = await assign();
            expect(allowed.status).toBe(operation === 'provider-role update' ? 202 : 201);
            expect((await allowed.json()).data).toMatchObject(body);
        });
    });
});
