/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, RealmScope } from '@authup/access';
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
    expectClientError,
} from '../../../../utils';
import { createFakeTimePolicy } from '../../../../utils/domains/policy';

/**
 * Regression (issue #3594): every `JunctionEntityService` read applied a
 * name-level pre-gate and then handed the decoded query straight to the
 * repository — no realm predicate, no per-row drop loop. So a junction row of
 * another realm was listed, was readable by id, and carried its member row
 * along through `include=`, to any caller holding the target permission triple.
 * The relations read gate (#3295) cannot catch that: it asks whether the caller
 * may read that TYPE, never whether it may reach that ROW's realm.
 *
 * The gate is the compiled-WHERE shape of #3574 / #3593, lowered onto each
 * junction's OWNER realm key (`roleRealmId`, `userRealmId`, `clientRealmId`,
 * `permissionRealmId`, `providerRealmId`) through the new
 * `compile({ realmAttributeName })`, plus `applyJunctionRealmScopeSelect` in the
 * adapters for the `post` branch.
 *
 * All EIGHT junctions are covered, not the five the issue names: the other
 * three (`client-permission`, `user-permission`,
 * `identity-provider-role-mapping`) carried the identical hole.
 *
 * Note which reader covers which half, as in
 * `global-entity-realm-isolation.spec.ts`. `reader` holds policy-free grants, so
 * `compile()` answers `conditional` and the reach never leaves SQL — a `fields=`
 * projection there proves nothing. `postReader` carries a non-lowerable
 * ATTRIBUTE_NAMES junction policy, which forces the per-row branch, and that is
 * the only branch where the force-select matters: `junctionResourceRealm` reads
 * the owner realm OFF THE ROW, so a stripped column coalesces to `null`, which
 * an `ownOrNull` reader reaches — i.e. it fails OPEN.
 */
describe('junction entities (realm isolation)', () => {
    const suite = createTestApplication();

    let reader: HTTPClient;
    const readerSecret = 'junction-iso-reader-secret';

    let postReader: HTTPClient;
    const postReaderSecret = 'junction-iso-post-reader-secret';

    let scopePolicyReader: HTTPClient;
    const scopePolicyReaderSecret = 'junction-iso-scope-policy-reader-secret';

    let attributesPolicyReader: HTTPClient;
    const attributesPolicyReaderSecret = 'junction-iso-attributes-policy-reader-secret';

    // one own / foreign pair per junction
    let ownRolePermissionId: string;
    let foreignRolePermissionId: string;
    let ownUserRoleId: string;
    let foreignUserRoleId: string;
    let ownClientRoleId: string;
    let foreignClientRoleId: string;
    let ownClientScopeId: string;
    let foreignClientScopeId: string;
    let ownClientPermissionId: string;
    let foreignClientPermissionId: string;
    let ownUserPermissionId: string;
    let foreignUserPermissionId: string;
    let ownPermissionPolicyId: string;
    let foreignPermissionPolicyId: string;
    let ownProviderRoleId: string;
    let foreignProviderRoleId: string;

    let foreignRoleId: string;

    const READ_GRANTS = [
        PermissionName.ROLE_PERMISSION_READ,
        PermissionName.USER_ROLE_READ,
        PermissionName.CLIENT_ROLE_READ,
        PermissionName.CLIENT_SCOPE_READ,
        // the client-permission read pre-gate accepts CREATE / DELETE only
        PermissionName.CLIENT_PERMISSION_CREATE,
        PermissionName.USER_PERMISSION_READ,
        // permission-policy is governed by the PERMISSION_* family
        PermissionName.PERMISSION_READ,
        PermissionName.IDENTITY_PROVIDER_ROLE_READ,
        // the member types, so the relations read gate (#3295) does NOT strip the
        // include — otherwise the foreign member's absence below would be that
        // gate's doing and would pin nothing about this one
        PermissionName.ROLE_READ,
    ];

    beforeAll(async () => {
        await suite.setup();

        const { data: realmB } = await suite.client.realm.create(createFakeRealm());

        // global members, bindable from either realm — so the junction rows differ
        // only in their OWNER realm, which is what the gate reads
        const { data: globalRole } = await suite.client.role.create(createFakeRole({ realmId: null }));
        const { data: globalPermission } = await suite.client.permission.create(
            createFakePermission({ realmId: null }),
        );
        const { data: globalScope } = await suite.client.scope.create(createFakeScope({ realmId: null }));

        const { data: ownRole } = await suite.client.role.create(createFakeRole());
        const { data: foreignRole } = await suite.client.role.create(createFakeRole({ realmId: realmB.id }));
        foreignRoleId = foreignRole.id;

        const { data: ownUser } = await suite.client.user.create(createFakeUser());
        const { data: foreignUser } = await suite.client.user.create(createFakeUser({ realmId: realmB.id }));

        const { data: ownClient } = await suite.client.client.create(createFakeClient());
        const { data: foreignClient } = await suite.client.client.create(
            createFakeClient({ realmId: realmB.id }),
        );

        const { data: ownPermission } = await suite.client.permission.create(createFakePermission());
        const { data: foreignPermission } = await suite.client.permission.create(
            createFakePermission({ realmId: realmB.id }),
        );
        const { data: policy } = await suite.client.policy.create(createFakeTimePolicy({ realmId: null }));

        const { data: ownProvider } = await suite.client.identityProvider.create(
            createFakeOAuth2IdentityProvider() as any,
        );
        const { data: foreignProvider } = await suite.client.identityProvider.create(
            { ...createFakeOAuth2IdentityProvider(), realmId: realmB.id } as any,
        );

        // role-permission — owner realm is roleRealmId
        ({ data: { id: ownRolePermissionId } } = await suite.client.rolePermission.create({
            roleId: ownRole.id,
            permissionId: globalPermission.id,
        }));
        ({ data: { id: foreignRolePermissionId } } = await suite.client.rolePermission.create({
            roleId: foreignRole.id,
            permissionId: globalPermission.id,
        }));

        // user-role — owner realm is userRealmId. The foreign row binds the
        // FOREIGN realm's role, so `include=role` there would surface realm B's
        // role: the disclosure the issue names.
        ({ data: { id: ownUserRoleId } } = await suite.client.userRole.create({
            userId: ownUser.id,
            roleId: globalRole.id,
        }));
        ({ data: { id: foreignUserRoleId } } = await suite.client.userRole.create({
            userId: foreignUser.id,
            roleId: foreignRole.id,
        }));

        // client-role / client-scope / client-permission — owner realm is clientRealmId
        ({ data: { id: ownClientRoleId } } = await suite.client.clientRole.create({
            clientId: ownClient.id,
            roleId: globalRole.id,
        }));
        ({ data: { id: foreignClientRoleId } } = await suite.client.clientRole.create({
            clientId: foreignClient.id,
            roleId: globalRole.id,
        }));

        ({ data: { id: ownClientScopeId } } = await suite.client.clientScope.create({
            clientId: ownClient.id,
            scopeId: globalScope.id,
        }));
        ({ data: { id: foreignClientScopeId } } = await suite.client.clientScope.create({
            clientId: foreignClient.id,
            scopeId: globalScope.id,
        }));

        ({ data: { id: ownClientPermissionId } } = await suite.client.clientPermission.create({
            clientId: ownClient.id,
            permissionId: globalPermission.id,
        }));
        ({ data: { id: foreignClientPermissionId } } = await suite.client.clientPermission.create({
            clientId: foreignClient.id,
            permissionId: globalPermission.id,
        }));

        // user-permission — owner realm is userRealmId
        ({ data: { id: ownUserPermissionId } } = await suite.client.userPermission.create({
            userId: ownUser.id,
            permissionId: globalPermission.id,
        }));
        ({ data: { id: foreignUserPermissionId } } = await suite.client.userPermission.create({
            userId: foreignUser.id,
            permissionId: globalPermission.id,
        }));

        // permission-policy — owner realm is permissionRealmId
        ({ data: { id: ownPermissionPolicyId } } = await suite.client.permissionPolicy.create({
            permissionId: ownPermission.id,
            policyId: policy.id,
        }));
        ({ data: { id: foreignPermissionPolicyId } } = await suite.client.permissionPolicy.create({
            permissionId: foreignPermission.id,
            policyId: policy.id,
        }));

        // identity-provider-role-mapping — owner realm is providerRealmId
        ({ data: { id: ownProviderRoleId } } = await suite.client.identityProviderRoleMapping.create({
            providerId: ownProvider.id,
            roleId: globalRole.id,
        }));
        ({ data: { id: foreignProviderRoleId } } = await suite.client.identityProviderRoleMapping.create({
            providerId: foreignProvider.id,
            roleId: globalRole.id,
        }));

        // a reader in master at `ownOrNull` reach — the realm_admin read shape,
        // policy-free, so every grant lowers and the reach runs as a WHERE
        const { data: readerClient } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: readerSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        for (const name of READ_GRANTS) {
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

        // the same reader with a junction policy that cannot be lowered, so
        // `compile()` answers `post` and the gate runs per row. Inverted over a
        // name no entity carries, it always passes, leaving the realm reach as the
        // only thing deciding a row.
        const { data: postPolicy } = await suite.client.policy.create({
            name: 'junction-iso-non-lowerable',
            type: BuiltInPolicyType.ATTRIBUTE_NAMES,
            invert: true,
            names: ['aFieldNoEntityCarries'],
        } as any);

        const { data: postReaderClient } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: postReaderSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        for (const name of READ_GRANTS) {
            const { data: permission } = await suite.client.permission.getOne(name);
            await suite.client.clientPermission.create({
                clientId: postReaderClient.id,
                permissionId: permission.id,
                realmScope: RealmScope.OWN_OR_NULL,
                policyId: postPolicy.id,
            });
        }
        const postToken = await suite.client.token.createWithClientCredentials({
            client_id: postReaderClient.id,
            client_secret: postReaderSecret,
        });
        postReader = new HTTPClient({ baseURL: suite.baseURL });
        postReader.setAuthorizationHeader({ type: 'Bearer', token: postToken.access_token });

        // a reader whose grants carry a user-authored policy that LOWERS — an operator
        // narrowing a role's reach, which is a supported configuration. Such a policy is
        // written against the ENTITY the permission names, so nothing rebases it onto a
        // junction's row shape; lowering it would emit SQL over a column the junction
        // table does not have. Both lowerable built-in shapes are covered: scope-mode
        // realm-match (the framework's own column) and attributes (the operator's).
        const { data: scopePolicy } = await suite.client.policy.create({
            name: 'junction-iso-scope-reach',
            type: BuiltInPolicyType.REALM_MATCH,
            scope: RealmScope.OWN,
        } as any);
        const { data: attributesPolicy } = await suite.client.policy.create({
            name: 'junction-iso-attributes-reach',
            type: BuiltInPolicyType.ATTRIBUTES,
            query: { realmId: { $eq: null } },
        } as any);

        const createPolicyBoundReader = async (secret: string, policyId: string) => {
            const { data: client } = await suite.client.client.create({
                ...createFakeClient(),
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                secret,
                secretHashed: false,
                secretEncrypted: false,
            });
            for (const name of READ_GRANTS) {
                const { data: permission } = await suite.client.permission.getOne(name);
                await suite.client.clientPermission.create({
                    clientId: client.id,
                    permissionId: permission.id,
                    realmScope: RealmScope.OWN_OR_NULL,
                    policyId,
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

        scopePolicyReader = await createPolicyBoundReader(scopePolicyReaderSecret, scopePolicy.id);
        attributesPolicyReader = await createPolicyBoundReader(attributesPolicyReaderSecret, attributesPolicy.id);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const collections = () => [
        ['role-permission', reader.rolePermission, ownRolePermissionId, foreignRolePermissionId],
        ['user-role', reader.userRole, ownUserRoleId, foreignUserRoleId],
        ['client-role', reader.clientRole, ownClientRoleId, foreignClientRoleId],
        ['client-scope', reader.clientScope, ownClientScopeId, foreignClientScopeId],
        ['client-permission', reader.clientPermission, ownClientPermissionId, foreignClientPermissionId],
        ['user-permission', reader.userPermission, ownUserPermissionId, foreignUserPermissionId],
        ['permission-policy', reader.permissionPolicy, ownPermissionPolicyId, foreignPermissionPolicyId],
        ['identity-provider-role-mapping', reader.identityProviderRoleMapping, ownProviderRoleId, foreignProviderRoleId],
    ] as [string, any, string, string][];

    it('lists own-realm junction rows', async () => {
        // the control: without it the absence assertions below could pass on a
        // gate that denies everything
        for (const [name, api, ownId] of collections()) {
            const response = await api.getMany({ filters: { id: ownId } });
            expect(response.data.some((entity: any) => entity.id === ownId), name).toBe(true);
        }
    });

    it('never lists a foreign-realm junction row', async () => {
        for (const [name, api, , foreignId] of collections()) {
            const response = await api.getMany({ filters: { id: foreignId } });
            expect(response.data.some((entity: any) => entity.id === foreignId), name).toBe(false);
            expect(response.meta.total, name).toEqual(0);
        }
    });

    it('never surfaces a foreign-realm member row through include=', async () => {
        // the disclosure the issue names: the junction row carried its member
        // along, and the relations read gate only checks the TYPE permission
        const response = await reader.userRole.getMany({
            filters: { id: foreignUserRoleId },
            relations: ['role'],
        });
        expect(response.data).toHaveLength(0);

        // the join really does happen for a row the reader may see, or this pins
        // nothing
        const own = await reader.userRole.getMany({
            filters: { id: ownUserRoleId },
            relations: ['role'],
        });
        expect(own.data).toHaveLength(1);
        expect(own.data[0].role).toBeDefined();

        // and the same for the other member side
        const rolePermission = await reader.rolePermission.getMany({
            filters: { id: foreignRolePermissionId },
            relations: ['permission'],
        });
        expect(rolePermission.data).toHaveLength(0);
    });

    it('refuses the single read of a foreign-realm junction row', async () => {
        // the list and the record read must agree — gating only the list would
        // hide a row `GET /<junction>/<uuid>` still returns
        for (const [name, api, , foreignId] of collections()) {
            await expectClientError(() => api.getOne(foreignId), { status: 403 }).catch((e) => {
                throw new Error(`${name}: ${(e as Error).message}`);
            });
        }
    });

    it('still reads an own-realm junction row one at a time', async () => {
        for (const [name, api, ownId] of collections()) {
            const { data } = await api.getOne(ownId);
            expect(data.id, name).toEqual(ownId);
        }
    });

    it('holds the gate on the post branch when the owner realm is projected away', async () => {
        // the force-select is what keeps the owner realm key on the row the
        // per-row gate reads; without it `junctionResourceRealm` coalesces the
        // missing column to `null`, which an `ownOrNull` reader reaches — so every
        // foreign row below comes back
        const cases: [string, any, string, string][] = [
            ['role-permission', postReader.rolePermission, ownRolePermissionId, foreignRolePermissionId],
            ['user-role', postReader.userRole, ownUserRoleId, foreignUserRoleId],
            ['client-role', postReader.clientRole, ownClientRoleId, foreignClientRoleId],
            ['client-scope', postReader.clientScope, ownClientScopeId, foreignClientScopeId],
            ['client-permission', postReader.clientPermission, ownClientPermissionId, foreignClientPermissionId],
            ['user-permission', postReader.userPermission, ownUserPermissionId, foreignUserPermissionId],
            ['permission-policy', postReader.permissionPolicy, ownPermissionPolicyId, foreignPermissionPolicyId],
            ['identity-provider-role-mapping', postReader.identityProviderRoleMapping, ownProviderRoleId, foreignProviderRoleId],
        ];

        for (const [name, api, ownId, foreignId] of cases) {
            // control: this reader can see its own-realm rows at all
            const own = await api.getMany({ filters: { id: ownId }, fields: ['id'] });
            expect(own.data.some((entity: any) => entity.id === ownId), name).toBe(true);

            const foreign = await api.getMany({ filters: { id: foreignId }, fields: ['id'] });
            expect(foreign.data, name).toHaveLength(0);
            // the drop loop decrements the total it reports
            expect(foreign.meta.total, name).toEqual(0);
        }
    });

    it('keeps the member include working for a foreign member of an own-realm row', async () => {
        // the gate reads the OWNER realm, never the member's — a global or
        // foreign member bound to an own-realm owner must still come back, or a
        // realm administrator loses the global building blocks it binds
        const response = await reader.rolePermission.getMany({
            filters: { id: ownRolePermissionId },
            relations: ['permission'],
        });
        expect(response.data).toHaveLength(1);
        expect(response.data[0].permission).toBeDefined();
        expect(response.data[0].permission!.realmId).toBeNull();
    });

    // A grant policy that LOWERS is written against the entity the permission names, so
    // pushing its condition onto a junction row emits SQL over a column that table lacks:
    // a 500, not a denial. The control is therefore that the read answers at all, while
    // the reach still gates the row.
    it.each([
        ['scope-mode realm-match', () => scopePolicyReader],
        ['attributes', () => attributesPolicyReader],
    ])('serves a reader whose grant carries a lowerable %s policy', async (_label, reader) => {
        const api = reader();
        const cases: [string, any, string, string][] = [
            ['role-permission', api.rolePermission, ownRolePermissionId, foreignRolePermissionId],
            ['user-role', api.userRole, ownUserRoleId, foreignUserRoleId],
            ['client-role', api.clientRole, ownClientRoleId, foreignClientRoleId],
            ['client-scope', api.clientScope, ownClientScopeId, foreignClientScopeId],
            ['client-permission', api.clientPermission, ownClientPermissionId, foreignClientPermissionId],
            ['user-permission', api.userPermission, ownUserPermissionId, foreignUserPermissionId],
            ['permission-policy', api.permissionPolicy, ownPermissionPolicyId, foreignPermissionPolicyId],
            ['identity-provider-role-mapping', api.identityProviderRoleMapping, ownProviderRoleId, foreignProviderRoleId],
        ];

        for (const [name, entityApi, ownId, foreignId] of cases) {
            // answering at all is the assertion; whether the row passes the operator's
            // own policy is that policy's business
            await entityApi.getMany({ filters: { id: ownId } });

            const foreign = await entityApi.getMany({ filters: { id: foreignId } });
            expect(foreign.data, name).toHaveLength(0);
        }
    });

    it('still lists an own-realm row for a reader whose grant carries a realm-match policy', async () => {
        // the control for the pair above: the scope-mode policy admits the reader's own
        // realm, so an empty result there would mean the gate denies everything
        const own = await scopePolicyReader.rolePermission.getMany({ filters: { id: ownRolePermissionId } });
        expect(own.data.some((entity: any) => entity.id === ownRolePermissionId)).toBe(true);
    });

    it('still refuses a foreign realm role to the reader directly', async () => {
        // the control for the include= assertion above: the member row itself is
        // out of reach, so its absence from the join is the junction gate working
        // rather than the entity gate alone
        await expectClientError(() => reader.role.getOne(foreignRoleId), { status: 403 });
    });
});
