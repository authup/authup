/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmScope } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
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
    createFakeRole,
    createFakeUser,
    expectClientError,
} from '../../../../utils/index.ts';

/**
 * A role carrying a realm-owned permission the actor does not hold may be
 * assigned by an actor managing that permission (#3855): it passes the real
 * `permission_update` gate on the row and the role grants no wider reach than
 * the actor's policy-free `permission_update`. Global permissions keep strict
 * dominance. Runs against the real evaluator, not a fake gate.
 */
describe('user-role: delegation over owned permissions', () => {
    const suite = createTestApplication();

    const ctx: Record<string, any> = {};
    const knownSecret = 'owned-delegation-secret-123';

    async function createActor(grants: PermissionName[]) : Promise<HTTPClient> {
        const { data: client } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: knownSecret,
            secretHashed: false,
            secretEncrypted: false,
        });

        for (const name of grants) {
            const { data: permission } = await suite.client.permission.getOne(name);

            await suite.client.clientPermission.create({ clientId: client.id, permissionId: permission.id });
        }

        const token = await suite.client.token.createWithClientCredentials({
            client_id: client.id,
            client_secret: knownSecret,
        });

        const actor = new HTTPClient({ baseURL: suite.baseURL });

        actor.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

        return actor;
    }

    async function createUserId() : Promise<string> {
        const { data } = await suite.client.user.create(createFakeUser({ realmId: ctx.realmId }));

        return data.id;
    }

    async function createRoleWith(permissionId: string, realmScope: `${RealmScope}`) : Promise<string> {
        const { data: role } = await suite.client.role.create(createFakeRole({ realmId: ctx.realmId }));

        await suite.client.rolePermission.create({
            roleId: role.id,
            permissionId,
            realmScope,
        });

        return role.id;
    }

    beforeAll(async () => {
        await suite.setup();

        const { data: master } = await suite.client.realm.getOne('master');

        ctx.realmId = master.id;

        const { data: owned } = await suite.client.permission.create({
            ...createFakePermission(),
            realmId: ctx.realmId,
        });
        const { data: global } = await suite.client.permission.create({
            ...createFakePermission(),
            realmId: null,
        });

        ctx.ownedRoleId = await createRoleWith(owned.id, RealmScope.OWN);
        ctx.ownedWideRoleId = await createRoleWith(owned.id, RealmScope.ANY);
        ctx.globalRoleId = await createRoleWith(global.id, RealmScope.OWN);

        ctx.manager = await createActor([
            PermissionName.USER_ROLE_CREATE,
            PermissionName.PERMISSION_UPDATE,
        ]);
        ctx.assigner = await createActor([
            PermissionName.USER_ROLE_CREATE,
        ]);
    }, 30_000);

    afterAll(async () => {
        await suite.teardown();
    });

    it('allows a permission manager to assign a role over a realm-owned permission it does not hold', async () => {
        const userId = await createUserId();
        const { data } = await ctx.manager.userRole.create({
            userId,
            roleId: ctx.ownedRoleId,
        });

        expect(data.roleId).toEqual(ctx.ownedRoleId);
        expect(data.userId).toEqual(userId);
    });

    it('refuses an actor without permission_update', async () => {
        const userId = await createUserId();

        await expectClientError(
            () => ctx.assigner.userRole.create({ userId, roleId: ctx.ownedRoleId }),
            { status: 403 },
        );
    });

    it('refuses a role granting wider reach than the manager holds', async () => {
        const userId = await createUserId();

        await expectClientError(
            () => ctx.manager.userRole.create({ userId, roleId: ctx.ownedWideRoleId }),
            { status: 403 },
        );
    });

    it('refuses a role over a global permission the actor does not hold', async () => {
        const userId = await createUserId();

        await expectClientError(
            () => ctx.manager.userRole.create({ userId, roleId: ctx.globalRoleId }),
            { status: 403 },
        );
    });
});
