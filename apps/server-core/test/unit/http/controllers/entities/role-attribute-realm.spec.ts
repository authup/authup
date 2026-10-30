/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmScope } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
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
    createFakeRole,
    httpRequest,
} from '../../../../utils';

/**
 * A role attribute is gated by ROLE_UPDATE against the realm of the role it
 * is attached to. A `role` object in the body names that role by its id and
 * nothing else, so its `realmId` cannot pick the realm the gate matches.
 */
describe('role attribute owner realm', () => {
    const suite = createTestApplication();

    let token: string;
    let ownRealmId: string;
    let foreignRoleId: string;

    async function create(body: Record<string, any>) {
        return httpRequest(suite, 'POST', '/role-attributes', {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    }

    beforeAll(async () => {
        await suite.setup();

        const { data: ownRealm } = await suite.client.realm.create(createFakeRealm());

        ownRealmId = ownRealm.id;

        const { data: foreignRealm } = await suite.client.realm.create(createFakeRealm());

        const { data: role } = await suite.client.role.create({
            ...createFakeRole(),
            realmId: foreignRealm.id,
        });

        foreignRoleId = role.id;

        const secret = 'role-attribute-realm-secret';
        const { data: client } = await suite.client.client.create({
            ...createFakeClient({ realmId: ownRealmId }),
            secret,
            secretHashed: false,
            secretEncrypted: false,
        });

        const { data: permission } = await suite.client.permission.getOne(PermissionName.ROLE_UPDATE);

        await suite.client.clientPermission.create({
            clientId: client.id,
            permissionId: permission.id,
            realmScope: RealmScope.OWN,
        });

        const response = await suite.client.token.createWithClientCredentials({
            client_id: client.id,
            client_secret: secret,
        });

        token = response.access_token;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('refuses an attribute on a foreign role named by roleId', async () => {
        const response = await create({
            roleId: foreignRoleId,
            name: 'by-id',
            value: 'v',
        });

        expect(response.status).toEqual(403);
    });

    it('refuses an attribute on a foreign role named by a role object carrying the actor realm', async () => {
        const response = await create({
            role: { id: foreignRoleId, realmId: ownRealmId },
            name: 'by-object',
            value: 'v',
        });

        expect(response.status).toEqual(403);
    });

    it('refuses a role object without a realm with 403, not 500', async () => {
        const response = await create({
            role: { id: foreignRoleId },
            name: 'by-bare-object',
            value: 'v',
        });

        expect(response.status).toEqual(403);
    });

    it('refuses a body naming no role with 400', async () => {
        const response = await create({ name: 'no-role', value: 'v' });

        expect(response.status).toEqual(400);
    });
});
