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
import { createTestApplication } from '../../../../app';
import {
    createFakeClient,
    createFakePermission,
    createFakeRealm,
    createFakeRole,
    createFakeScope,
    expectClientError,
} from '../../../../utils';
import { createFakeTimePolicy } from '../../../../utils/domains/policy';

/**
 * Regression (issue #3574): `role`, `scope`, `permission` and `policy` are the
 * global-capable entities — a row carries either a realm id or `realmId: null`
 * (a system-level building block). Both their read paths were ungated: neither
 * `getMany` nor `getOne` ran a per-row realm gate, so a realm-scoped reader
 * listed and read every realm's rows. For `policy` that shipped the full
 * policy CONFIGURATION cross-realm, because the adapter splices the extra
 * attributes on AFTER the field projection.
 *
 * The gate is the compiled-WHERE shape every other realm-gated read uses
 * (#3286 phase 3), plus `applyRealmScopeSelect` in the adapters so a
 * `fields=` projection cannot strip the column the post-fallback reads —
 * `resourceRealmMatch` is PRESENCE-based, so a stripped `realmId` leaves the
 * realm-match key absent and the reach factor neutral-passes (fails OPEN).
 */
describe('global-capable entities (realm isolation)', () => {
    const suite = createTestApplication();

    let reader: HTTPClient;
    const readerSecret = 'global-entity-iso-reader-secret';

    let ownRoleId: string;
    let foreignRoleId: string;
    let ownScopeId: string;
    let foreignScopeId: string;
    let ownPermissionId: string;
    let foreignPermissionId: string;
    let ownPolicyId: string;
    let foreignPolicyId: string;

    let globalRoleId: string;
    let globalPermissionId: string;

    beforeAll(async () => {
        await suite.setup();

        const { data: realmB } = await suite.client.realm.create(createFakeRealm());

        const { data: ownRole } = await suite.client.role.create(createFakeRole());
        ownRoleId = ownRole.id;
        const { data: foreignRole } = await suite.client.role.create(
            createFakeRole({ realmId: realmB.id }),
        );
        foreignRoleId = foreignRole.id;

        const { data: ownScope } = await suite.client.scope.create(createFakeScope());
        ownScopeId = ownScope.id;
        const { data: foreignScope } = await suite.client.scope.create(
            createFakeScope({ realmId: realmB.id }),
        );
        foreignScopeId = foreignScope.id;

        const { data: ownPermission } = await suite.client.permission.create(createFakePermission());
        ownPermissionId = ownPermission.id;
        const { data: foreignPermission } = await suite.client.permission.create(
            createFakePermission({ realmId: realmB.id }),
        );
        foreignPermissionId = foreignPermission.id;

        const { data: ownPolicy } = await suite.client.policy.create(createFakeTimePolicy());
        ownPolicyId = ownPolicy.id;
        const { data: foreignPolicy } = await suite.client.policy.create(
            createFakeTimePolicy({ realmId: realmB.id }),
        );
        foreignPolicyId = foreignPolicy.id;

        // the global (realmId: null) building blocks an `ownOrNull` reader must keep
        const { data: globalRole } = await suite.client.role.create(
            createFakeRole({ realmId: null }),
        );
        globalRoleId = globalRole.id;
        const { data: globalPermission } = await suite.client.permission.create(
            createFakePermission({ realmId: null }),
        );
        globalPermissionId = globalPermission.id;

        // a reader in master at `ownOrNull` reach — the realm_admin read shape.
        // `policy` is governed by the PERMISSION_* family, so three grants cover four entities.
        const { data: readerClient } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: readerSecret,
            secretHashed: false,
            secretEncrypted: false,
        });

        const names = [
            PermissionName.ROLE_READ,
            PermissionName.SCOPE_READ,
            PermissionName.PERMISSION_READ,
        ];
        for (const name of names) {
            const { data: permission } = await suite.client.permission.getOne(name);
            await suite.client.clientPermission.create({
                clientId: readerClient.id,
                permissionId: permission.id,
                realmScope: RealmScope.OWN_OR_NULL,
            });
        }

        const token = await suite.client.token.createWithClientCredentials({
            client_id: readerClient.id,
            client_secret: readerSecret,
        });
        reader = new HTTPClient({ baseURL: suite.baseURL });
        reader.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('lists own-realm and global roles, never a foreign realm', async () => {
        const own = await reader.role.getMany({ filters: { id: ownRoleId } });
        expect(own.data.some((entity) => entity.id === ownRoleId)).toBe(true);

        const global = await reader.role.getMany({ filters: { id: globalRoleId } });
        expect(global.data.some((entity) => entity.id === globalRoleId)).toBe(true);

        const foreign = await reader.role.getMany({ filters: { id: foreignRoleId } });
        expect(foreign.data.some((entity) => entity.id === foreignRoleId)).toBe(false);
        expect(foreign.meta.total).toEqual(0);
    });

    it('lists own-realm scopes, never a foreign realm', async () => {
        const own = await reader.scope.getMany({ filters: { id: ownScopeId } });
        expect(own.data.some((entity) => entity.id === ownScopeId)).toBe(true);

        const foreign = await reader.scope.getMany({ filters: { id: foreignScopeId } });
        expect(foreign.data.some((entity) => entity.id === foreignScopeId)).toBe(false);
        expect(foreign.meta.total).toEqual(0);
    });

    it('lists own-realm and global permissions, never a foreign realm', async () => {
        const own = await reader.permission.getMany({ filters: { id: ownPermissionId } });
        expect(own.data.some((entity) => entity.id === ownPermissionId)).toBe(true);

        const global = await reader.permission.getMany({ filters: { id: globalPermissionId } });
        expect(global.data.some((entity) => entity.id === globalPermissionId)).toBe(true);

        const foreign = await reader.permission.getMany({ filters: { id: foreignPermissionId } });
        expect(foreign.data.some((entity) => entity.id === foreignPermissionId)).toBe(false);
        expect(foreign.meta.total).toEqual(0);
    });

    it('lists own-realm policies, never a foreign realm', async () => {
        const own = await reader.policy.getMany({ filters: { id: ownPolicyId } });
        expect(own.data.some((entity) => entity.id === ownPolicyId)).toBe(true);

        const foreign = await reader.policy.getMany({ filters: { id: foreignPolicyId } });
        expect(foreign.data.some((entity) => entity.id === foreignPolicyId)).toBe(false);
        expect(foreign.meta.total).toEqual(0);
    });

    it('never ships a foreign realm policy configuration', async () => {
        // the policy adapter splices the extra attributes on AFTER the projection,
        // so an ungated list carries another tenant's access-control rules
        const foreign = await reader.policy.getMany({ filters: { id: foreignPolicyId } });
        expect(foreign.data).toHaveLength(0);
    });

    it('keeps a foreign-realm row hidden even when realmId is projected away', async () => {
        const role = await reader.role.getMany({
            filters: { id: foreignRoleId },
            fields: ['id', 'name'],
        });
        expect(role.data.some((entity) => entity.id === foreignRoleId)).toBe(false);

        const scope = await reader.scope.getMany({
            filters: { id: foreignScopeId },
            fields: ['id', 'name'],
        });
        expect(scope.data.some((entity) => entity.id === foreignScopeId)).toBe(false);

        const permission = await reader.permission.getMany({
            filters: { id: foreignPermissionId },
            fields: ['id', 'name'],
        });
        expect(permission.data.some((entity) => entity.id === foreignPermissionId)).toBe(false);

        const policy = await reader.policy.getMany({
            filters: { id: foreignPolicyId },
            fields: ['id', 'name'],
        });
        expect(policy.data.some((entity) => entity.id === foreignPolicyId)).toBe(false);
    });

    it('refuses the single read of a foreign-realm row', async () => {
        // the list and the record read must agree — gating only the list would
        // hide a row that `GET /<entity>/<uuid>` still returns
        await expectClientError(() => reader.role.getOne(foreignRoleId), { status: 403 });
        await expectClientError(() => reader.scope.getOne(foreignScopeId), { status: 403 });
        await expectClientError(() => reader.permission.getOne(foreignPermissionId), { status: 403 });
        await expectClientError(() => reader.policy.getOne(foreignPolicyId), { status: 403 });
    });

    it('still reads own-realm and global rows one at a time', async () => {
        const { data: role } = await reader.role.getOne(ownRoleId);
        expect(role.id).toEqual(ownRoleId);

        const { data: globalRole } = await reader.role.getOne(globalRoleId);
        expect(globalRole.id).toEqual(globalRoleId);

        const { data: scope } = await reader.scope.getOne(ownScopeId);
        expect(scope.id).toEqual(ownScopeId);

        const { data: permission } = await reader.permission.getOne(ownPermissionId);
        expect(permission.id).toEqual(ownPermissionId);

        const { data: policy } = await reader.policy.getOne(ownPolicyId);
        expect(policy.id).toEqual(ownPolicyId);
    });
});
