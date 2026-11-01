/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, RealmScope } from '@authup/access';
import { PermissionName, REALM_MASTER_NAME } from '@authup/core-kit';
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
    createFakeUser,
} from '../../../../utils';
import { createFakeTimePolicy } from '../../../../utils/domains/policy';

/**
 * The relations read gate decides whether the actor may join a relation's
 * TYPE; the joined row itself must also be in the actor's reach of that
 * type, or an included relation discloses a row the target's own read route
 * refuses.
 */
describe('http/controllers (include reach)', () => {
    const suite = createTestApplication();

    const SETUP_HOOK_TIMEOUT = 60_000;

    let ownOrNullReader: HTTPClient;
    let postReader: HTTPClient;
    let ownReader: HTTPClient;
    let ownRoleReader: HTTPClient;
    let attributeReader: HTTPClient;

    let ownRoleBindingId: string;
    let foreignRoleBindingId: string;
    let globalRoleBindingId: string;
    let foreignRoleId: string;
    let foreignRoleName: string;
    let globalRoleName: string;
    let openRoleBindingId: string;
    let closedRoleBindingId: string;

    let ownPolicyClientId: string;
    let globalPolicyClientId: string;

    const createReader = async (
        names: PermissionName[],
        realmScope: `${RealmScope}`,
        policyId?: string,
        policies: Partial<Record<PermissionName, string>> = {},
    ) => {
        const secret = 'include-reach-secret';
        const { data: client } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret,
            secretHashed: false,
            secretEncrypted: false,
        });

        for (const name of names) {
            const { data: permission } = await suite.client.permission.getOne(name);

            await suite.client.clientPermission.create({
                clientId: client.id,
                permissionId: permission.id,
                realmScope,
                ...(policyId ? { policyId } : {}),
                ...(policies[name] ? { policyId: policies[name] } : {}),
            });
        }

        const token = await suite.client.token.createWithClientCredentials({
            client_id: client.id,
            client_secret: secret,
        });

        const http = new HTTPClient({ baseURL: suite.baseURL });

        http.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

        return http;
    };

    beforeAll(async () => {
        await suite.setup();

        const { data: realmB } = await suite.client.realm.create(createFakeRealm());
        const { data: master } = await suite.client.realm.getOne(REALM_MASTER_NAME);

        const { data: ownRole } = await suite.client.role.create(createFakeRole({ realmId: master.id }));
        const { data: foreignRole } = await suite.client.role.create(createFakeRole({ realmId: realmB.id }));
        const { data: globalRole } = await suite.client.role.create(createFakeRole({ realmId: null }));

        foreignRoleId = foreignRole.id;
        foreignRoleName = foreignRole.name;
        globalRoleName = globalRole.name;

        const { data: user } = await suite.client.user.create(createFakeUser());

        ({ data: { id: ownRoleBindingId } } = await suite.client.userRole.create({
            userId: user.id,
            roleId: ownRole.id,
        }));
        ({ data: { id: foreignRoleBindingId } } = await suite.client.userRole.create({
            userId: user.id,
            roleId: foreignRole.id,
        }));
        ({ data: { id: globalRoleBindingId } } = await suite.client.userRole.create({
            userId: user.id,
            roleId: globalRole.id,
        }));

        const { data: ownPolicy } = await suite.client.policy.create(createFakeTimePolicy({ realmId: master.id }));
        const { data: globalPolicy } = await suite.client.policy.create(createFakeTimePolicy({ realmId: null }));

        ({ data: { id: ownPolicyClientId } } = await suite.client.client.create(createFakeClient({
            realmId: master.id,
            accessPolicyId: ownPolicy.id,
        })));
        ({ data: { id: globalPolicyClientId } } = await suite.client.client.create(createFakeClient({
            realmId: master.id,
            accessPolicyId: globalPolicy.id,
        })));

        ownOrNullReader = await createReader(
            [PermissionName.USER_ROLE_READ, PermissionName.ROLE_READ],
            RealmScope.OWN_OR_NULL,
        );

        // inverted over a name no entity carries: always passes, but cannot be
        // lowered, so every gate takes its per-row branch
        const { data: postPolicy } = await suite.client.policy.create({
            name: `include-reach-non-lowerable-${Date.now()}`,
            type: BuiltInPolicyType.ATTRIBUTE_NAMES,
            invert: true,
            names: ['aFieldNoEntityCarries'],
        } as any);

        postReader = await createReader(
            [PermissionName.USER_ROLE_READ, PermissionName.ROLE_READ],
            RealmScope.OWN_OR_NULL,
            postPolicy.id,
        );

        ownReader = await createReader(
            [PermissionName.CLIENT_READ, PermissionName.PERMISSION_READ],
            RealmScope.OWN,
        );

        const { data: openRole } = await suite.client.role.create(createFakeRole({
            realmId: master.id,
            description: 'include-reach-open',
        }));
        const { data: closedRole } = await suite.client.role.create(createFakeRole({
            realmId: master.id,
            description: 'include-reach-closed',
        }));

        ({ data: { id: openRoleBindingId } } = await suite.client.userRole.create({
            userId: user.id,
            roleId: openRole.id,
        }));
        ({ data: { id: closedRoleBindingId } } = await suite.client.userRole.create({
            userId: user.id,
            roleId: closedRole.id,
        }));

        const { data: descriptionPolicy } = await suite.client.policy.create({
            name: `include-reach-description-${Date.now()}`,
            type: BuiltInPolicyType.ATTRIBUTES,
            query: { description: { $eq: 'include-reach-open' } },
        } as any);

        attributeReader = await createReader(
            [PermissionName.USER_ROLE_READ, PermissionName.ROLE_READ],
            RealmScope.OWN_OR_NULL,
            undefined,
            { [PermissionName.ROLE_READ]: descriptionPolicy.id },
        );

        ownRoleReader = await createReader(
            [PermissionName.USER_ROLE_READ, PermissionName.ROLE_READ],
            RealmScope.OWN,
        );
    }, SETUP_HOOK_TIMEOUT);

    afterAll(async () => {
        await suite.teardown();
    }, SETUP_HOOK_TIMEOUT);

    const readBindings = async (reader: HTTPClient) => {
        const response = await reader.userRole.getMany({
            filters: { id: [ownRoleBindingId, foreignRoleBindingId, globalRoleBindingId] },
            relations: ['role'],
        });

        return new Map(response.data.map((row) => [row.id, row]));
    };

    it('should strip an included role outside the reader\'s role reach', async () => {
        for (const reader of [ownOrNullReader, postReader]) {
            const rows = await readBindings(reader);

            expect(rows.size).toEqual(3);

            expect(rows.get(ownRoleBindingId)!.role).toBeDefined();
            expect(rows.get(globalRoleBindingId)!.role).toBeDefined();

            const foreign = rows.get(foreignRoleBindingId)!;

            expect(foreign.roleId).toEqual(foreignRoleId);
            expect(foreign.role).toBeUndefined();
        }
    });

    it('should strip a role joined by a fields projection without an include', async () => {
        const response = await ownOrNullReader.userRole.getMany({
            filters: { id: [ownRoleBindingId, foreignRoleBindingId] },
            fields: { role: ['id', 'name', 'realmId'] },
        });

        const rows = new Map(response.data.map((row) => [row.id, row]));

        expect(rows.size).toEqual(2);
        expect(rows.get(ownRoleBindingId)!.role).toBeDefined();
        expect(rows.get(foreignRoleBindingId)!.role).toBeUndefined();
    });

    it('should check a sparsely projected role against its whole row', async () => {
        const response = await postReader.userRole.getMany({
            filters: { id: [ownRoleBindingId, foreignRoleBindingId] },
            relations: ['role'],
            fields: { role: ['id', 'name'] },
        });

        const rows = new Map(response.data.map((row) => [row.id, row]));

        expect(rows.size).toEqual(2);
        expect(Object.keys(rows.get(ownRoleBindingId)!.role!).sort()).toEqual(['id', 'name']);
        expect(rows.get(foreignRoleBindingId)!.role).toBeUndefined();
    });

    it('should decide a policy on a column the projection left out', async () => {
        const response = await attributeReader.userRole.getMany({
            filters: { id: [openRoleBindingId, closedRoleBindingId] },
            fields: { role: ['id', 'name'] },
        });

        const rows = new Map(response.data.map((row) => [row.id, row]));

        expect(rows.size).toEqual(2);
        expect(Object.keys(rows.get(openRoleBindingId)!.role!).sort()).toEqual(['id', 'name']);
        expect(rows.get(closedRoleBindingId)!.role).toBeUndefined();
    });

    it('should strip an included access policy outside the reader\'s policy reach', async () => {
        const response = await ownReader.client.getMany({
            filters: { id: [ownPolicyClientId, globalPolicyClientId] },
            relations: ['accessPolicy'],
        });

        const rows = new Map(response.data.map((row) => [row.id, row]));

        expect(rows.size).toEqual(2);
        expect(rows.get(ownPolicyClientId)!.accessPolicy).toBeDefined();
        expect(rows.get(globalPolicyClientId)!.accessPolicy).toBeUndefined();
        expect(rows.get(globalPolicyClientId)!.accessPolicyId).toBeDefined();
    });

    it('should strip the same access policy on the record read', async () => {
        const { data: own } = await ownReader.client.getOne(ownPolicyClientId, { relations: ['accessPolicy'] });
        const { data: global } = await ownReader.client.getOne(globalPolicyClientId, { relations: ['accessPolicy'] });

        expect(own.accessPolicy).toBeDefined();
        expect(global.accessPolicy).toBeUndefined();
    });

    // A dotted key joins the relation for its WHERE or ORDER BY without the
    // row gate an include gets, so it is pruned for a restricted reader.
    describe('a dotted filter or sort key through the relation', () => {
        const ids = () => [ownRoleBindingId, foreignRoleBindingId, globalRoleBindingId];

        const filterByRoleName = async (reader: HTTPClient, name: string) => {
            const response = await reader.userRole.getMany({ filters: { id: ids(), 'role.name': name } as Record<string, any> });

            return response.data.map((row) => row.id).sort();
        };

        const sortByRoleName = async (reader: HTTPClient, direction: 'ASC' | 'DESC') => {
            const response = await reader.userRole.getMany({
                filters: { id: ids() },
                sort: { 'role.name': direction } as Record<string, any>,
            });

            return response.data.map((row) => row.id);
        };

        it('should still match for an unrestricted reader', async () => {
            expect(await filterByRoleName(suite.client, foreignRoleName)).toEqual([foreignRoleBindingId]);
        });

        it('should not match a binding by the name of a role out of the reader\'s reach', async () => {
            const all = [...ids()].sort();

            expect(await filterByRoleName(ownRoleReader, foreignRoleName)).toEqual(all);
            expect(await filterByRoleName(ownRoleReader, globalRoleName)).toEqual(all);
        });

        it('should not order bindings by the name of a role out of the reader\'s reach', async () => {
            expect(await sortByRoleName(ownRoleReader, 'ASC')).toEqual(await sortByRoleName(ownRoleReader, 'DESC'));
        });
    });
});
