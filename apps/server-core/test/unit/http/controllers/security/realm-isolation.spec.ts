/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { 
    Client as ClientEntity, 
    Realm, 
    Role, 
    Scope, 
} from '@authup/core-kit';
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
    createFakeRealm,
    createFakeRole,
    createFakeScope,
} from '../../../../utils';

/**
 * REGRESSION test for the junction realm-isolation fix (plan 033).
 *
 * Actor C_A is a confidential client in the MASTER realm (realm A) holding a set of
 * *_CREATE permissions, each granted with the default `realm_scope: own` — i.e. a
 * deliberately RESTRICTED actor whose realm reach is realm A only. Pointed at resources
 * that belong to a DIFFERENT realm B, its junction writes must be rejected: each junction
 * service stamps its OWNER realm as the canonical `realm_id` onto the evaluate() input, so
 * the realm_scope factor gates the write exactly as it gates a direct entity write. The
 * own-realm case must still succeed (no over-tightening).
 */
describe('http/controllers/security (realm isolation of junction writes)', () => {
    const suite = createTestApplication();

    let realmB: Realm;
    let roleB: Role;
    let clientB: ClientEntity;
    let globalScope: Scope;
    let roleReadPermissionId: string;

    let actor: HTTPClient;
    const knownSecret = 'realm-isolation-secret-123';

    beforeAll(async () => {
        await suite.setup();

        // --- realm B + resources owned by realm B ---
        realmB = await suite.client.realm.create(createFakeRealm());
        roleB = await suite.client.role.create(createFakeRole({ realm_id: realmB.id }));
        clientB = await suite.client.client.create({
            ...createFakeClient(),
            realm_id: realmB.id,
        });
        globalScope = await suite.client.scope.create(createFakeScope({ realm_id: null }));

        const roleReadPermission = await suite.client.permission.getOne(PermissionName.ROLE_READ);
        roleReadPermissionId = roleReadPermission.id;

        // --- restricted actor C_A in the master realm (realm A) ---
        const cA = await suite.client.client.create({
            ...createFakeClient(),
            is_confidential: true,
            secret: knownSecret,
            secret_hashed: false,
            secret_encrypted: false,
        });

        const grantPermissions = [
            PermissionName.ROLE_PERMISSION_CREATE,
            PermissionName.ROLE_READ,
            PermissionName.CLIENT_SCOPE_CREATE,
            PermissionName.ROLE_CREATE,
        ];
        for (const name of grantPermissions) {
            const permission = await suite.client.permission.getOne(name);
            // default realm_scope === 'own' -> reach is realm A only
            await suite.client.clientPermission.create({
                client_id: cA.id,
                permission_id: permission.id,
            });
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

    it('CONTROL: rejects creating a base entity (role) in another realm (top-level realm_id IS gated)', async () => {
        await expect(
            actor.role.create(createFakeRole({ realm_id: realmB.id })),
        ).rejects.toThrow();
    });

    it('rejects a restricted realm-A actor attaching a permission onto a realm-B role (role-permission)', async () => {
        await expect(
            actor.rolePermission.create({
                role_id: roleB.id,
                permission_id: roleReadPermissionId,
            }),
        ).rejects.toThrow();
    });

    it('rejects a restricted realm-A actor mutating a realm-B client scope binding (client-scope)', async () => {
        await expect(
            actor.clientScope.create({
                client_id: clientB.id,
                scope_id: globalScope.id,
            }),
        ).rejects.toThrow();
    });

    it('rejects a restricted realm-A actor managing a GLOBAL role (own !== null, per plan 033)', async () => {
        const globalRole = await suite.client.role.create(createFakeRole({ realm_id: null }));
        await expect(
            actor.rolePermission.create({
                role_id: globalRole.id,
                permission_id: roleReadPermissionId,
            }),
        ).rejects.toThrow();
    });

    it('still allows the actor to manage junctions in its OWN realm (no over-tightening)', async () => {
        // a role + permission in the actor's own (master) realm — must succeed
        const roleA = await suite.client.role.create(createFakeRole());
        const result = await actor.rolePermission.create({
            role_id: roleA.id,
            permission_id: roleReadPermissionId,
        });
        expect(result.id).toBeDefined();
        expect(result.role_id).toBe(roleA.id);
    });
});
