/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmScope } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import type { RoleAttribute } from '@authup/core-kit';
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
    let ownRoleId: string;

    async function send(path: string, body: Record<string, any>) {
        return httpRequest(suite, 'POST', path, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    }

    async function create(body: Record<string, any>) {
        return send('/role-attributes', body);
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

        const { data: ownRole } = await suite.client.role.create({
            ...createFakeRole(),
            realmId: ownRealmId,
        });

        ownRoleId = ownRole.id;

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

    describe('a body id', () => {
        let globalAttribute: RoleAttribute;

        beforeAll(async () => {
            const { data: globalRole } = await suite.client.role.create(createFakeRole());
            const { data } = await suite.client.roleAttribute.create({
                roleId: globalRole.id,
                name: 'global-attribute',
                value: 'global-value',
            });

            globalAttribute = data;
        });

        async function expectGlobalAttributeUntouched() {
            const { data } = await suite.client.roleAttribute.getOne(globalAttribute.id);

            expect(data).toMatchObject({
                roleId: globalAttribute.roleId,
                realmId: null,
                name: 'global-attribute',
                value: 'global-value',
            });
        }

        it('never retargets a create onto another row', async () => {
            const response = await create({
                id: globalAttribute.id,
                roleId: ownRoleId,
                name: 'created-with-id',
                value: 'v',
            });

            expect(response.status).toEqual(201);

            const body = await response.json();

            expect(body.data.id).not.toEqual(globalAttribute.id);
            expect(body.data.roleId).toEqual(ownRoleId);

            await expectGlobalAttributeUntouched();
        });

        it('never retargets an update onto another row', async () => {
            const { data: own } = await suite.client.roleAttribute.create({
                roleId: ownRoleId,
                name: 'own-attribute',
                value: 'v',
            });

            const response = await send(`/role-attributes/${own.id}`, {
                id: globalAttribute.id,
                name: 'renamed',
                value: 'overwritten',
            });

            expect(response.status).toEqual(202);

            const body = await response.json();

            expect(body.data).toMatchObject({
                id: own.id,
                roleId: ownRoleId,
                realmId: ownRealmId,
                name: 'renamed',
                value: 'overwritten',
            });

            await expectGlobalAttributeUntouched();
        });
    });
});
