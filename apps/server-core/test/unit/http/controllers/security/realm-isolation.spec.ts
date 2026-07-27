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
    createFakeOAuth2IdentityProvider,
    createFakePermission,
    createFakeRealm,
    createFakeRole,
    createFakeScope,
    createFakeUser,
} from '../../../../utils';
import { createFakeTimePolicy } from '../../../../utils/domains/policy';

/**
 * STRUCTURAL GUARD for the junction realm-isolation contract (plan 033, Layer 2).
 *
 * Every junction service stamps its OWNER realm as the canonical `realmId` so the
 * realmScope factor gates the write. This spec is the coverage contract: for EVERY
 * junction it asserts a restricted realm-A actor (own scope) (a) CAN write a junction
 * owned by its own realm — proving the setup is otherwise valid — and (b) CANNOT write
 * the same junction owned by realm B. A junction whose service forgets the stamp would
 * pass (b) and turn this red. Add a junction => add a row here.
 */
describe('http/controllers/security (junction realm-isolation — all junctions)', () => {
    const suite = createTestApplication();

    const ctx: Record<string, any> = {};
    let actor: HTTPClient;
    const knownSecret = 'realm-isolation-secret-123';

    beforeAll(async () => {
        await suite.setup();

        const { data: realmB } = await suite.client.realm.create(createFakeRealm());

        // --- restricted actor C_A in the master realm (realm A), every grant `own` ---
        const { data: cA } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: knownSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        const masterRealmId = cA.realmId;

        // --- owner entities, one per realm (A = the actor's own realm, B = foreign) ---
        ctx.roleA = (await suite.client.role.create(createFakeRole({ realmId: masterRealmId }))).data;
        ctx.roleB = (await suite.client.role.create(createFakeRole({ realmId: realmB.id }))).data;
        ctx.userA = (await suite.client.user.create(createFakeUser({ realmId: masterRealmId }))).data;
        ctx.userB = (await suite.client.user.create(createFakeUser({ realmId: realmB.id }))).data;
        ctx.clientA = (await suite.client.client.create({ ...createFakeClient(), realmId: masterRealmId })).data;
        ctx.clientB = (await suite.client.client.create({ ...createFakeClient(), realmId: realmB.id })).data;
        ctx.providerA = (await suite.client.identityProvider.create({ ...createFakeOAuth2IdentityProvider(), realmId: masterRealmId })).data;
        ctx.providerB = (await suite.client.identityProvider.create({ ...createFakeOAuth2IdentityProvider(), realmId: realmB.id })).data;
        ctx.permissionA = (await suite.client.permission.create({ ...createFakePermission(), realmId: masterRealmId })).data;
        ctx.permissionB = (await suite.client.permission.create({ ...createFakePermission(), realmId: realmB.id })).data;

        // --- members the actor can legitimately reference (own/global) ---
        const { data: roleReadPermission } = await suite.client.permission.getOne(PermissionName.ROLE_READ);
        ctx.roleReadPermissionId = roleReadPermission.id;
        ctx.emptyRoleId = (await suite.client.role.create(createFakeRole({ realmId: null }))).data.id; // no perms => supersettable
        ctx.globalScopeId = (await suite.client.scope.create(createFakeScope({ realmId: null }))).data.id;
        ctx.globalPolicyId = (await suite.client.policy.create(createFakeTimePolicy())).data.id;

        // --- grant the actor every operation permission (default realmScope: own) ---
        const grants = [
            PermissionName.ROLE_PERMISSION_CREATE,
            PermissionName.USER_PERMISSION_CREATE,
            PermissionName.CLIENT_PERMISSION_CREATE,
            PermissionName.USER_ROLE_CREATE,
            PermissionName.CLIENT_ROLE_CREATE,
            PermissionName.CLIENT_SCOPE_CREATE,
            PermissionName.IDENTITY_PROVIDER_ROLE_CREATE,
            PermissionName.PERMISSION_UPDATE,
            PermissionName.ROLE_READ, // the member attached by the *-permission junctions
            PermissionName.ROLE_CREATE, // for the entity CONTROL below
        ];
        for (const name of grants) {
            const { data: permission } = await suite.client.permission.getOne(name);
            await suite.client.clientPermission.create({ clientId: cA.id, permissionId: permission.id });
        }

        const token = await suite.client.token.createWithClientCredentials({
            client_id: cA.id,
            client_secret: knownSecret,
        });
        actor = new HTTPClient({ baseURL: suite.baseURL });
        actor.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('CONTROL: rejects creating a base entity (role) in another realm', async () => {
        await expect(
            actor.role.create(createFakeRole({ realmId: ctx.roleB.realmId })),
        ).rejects.toThrow();
    });

    const JUNCTIONS: {
        name: string;
        api: string;
        ownerA: string;
        ownerB: string;
        body: (ownerId: string, c: Record<string, any>) => Record<string, any>;
    }[] = [
        {
            name: 'role-permission', 
            api: 'rolePermission', 
            ownerA: 'roleA', 
            ownerB: 'roleB', 
            body: (id, c) => ({ roleId: id, permissionId: c.roleReadPermissionId }), 
        },
        {
            name: 'user-permission', 
            api: 'userPermission', 
            ownerA: 'userA', 
            ownerB: 'userB', 
            body: (id, c) => ({ userId: id, permissionId: c.roleReadPermissionId }), 
        },
        {
            name: 'client-permission', 
            api: 'clientPermission', 
            ownerA: 'clientA', 
            ownerB: 'clientB', 
            body: (id, c) => ({ clientId: id, permissionId: c.roleReadPermissionId }), 
        },
        {
            name: 'user-role', 
            api: 'userRole', 
            ownerA: 'userA', 
            ownerB: 'userB', 
            body: (id, c) => ({ userId: id, roleId: c.emptyRoleId }), 
        },
        {
            name: 'client-role', 
            api: 'clientRole', 
            ownerA: 'clientA', 
            ownerB: 'clientB', 
            body: (id, c) => ({ clientId: id, roleId: c.emptyRoleId }), 
        },
        {
            name: 'client-scope', 
            api: 'clientScope', 
            ownerA: 'clientA', 
            ownerB: 'clientB', 
            body: (id, c) => ({ clientId: id, scopeId: c.globalScopeId }), 
        },
        {
            name: 'identity-provider-role-mapping', 
            api: 'identityProviderRoleMapping', 
            ownerA: 'providerA', 
            ownerB: 'providerB', 
            body: (id, c) => ({ providerId: id, roleId: c.emptyRoleId }), 
        },
        {
            name: 'permission-policy', 
            api: 'permissionPolicy', 
            ownerA: 'permissionA', 
            ownerB: 'permissionB', 
            body: (id, c) => ({ permissionId: id, policyId: c.globalPolicyId }), 
        },
    ];

    describe.each(JUNCTIONS)('$name owner-realm gating', ({
        api, 
        ownerA, 
        ownerB, 
        body, 
    }) => {
        it('allows the restricted actor on an OWN-realm owner (setup is valid)', async () => {
            const result = await (actor as any)[api].create(body(ctx[ownerA].id, ctx));
            expect(result.data.id).toBeDefined();
        });

        it('rejects the restricted actor on a realm-B owner (owner-realm is gated)', async () => {
            await expect(
                (actor as any)[api].create(body(ctx[ownerB].id, ctx)),
            ).rejects.toThrow();
        });
    });
});
