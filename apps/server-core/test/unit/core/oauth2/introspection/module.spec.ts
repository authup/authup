/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    PermissionMemoryProvider,
    PolicyData,
    createAuthorizationEvaluator,
} from '@authup/access';
import { IdentityPermissionProvider } from '../../../../../src/core/identity/permission/module.ts';
import { FakeUserRepository } from '../../entities/user/fake-repository.ts';
import { FakeClientRepository } from '../../entities/client/fake-repository.ts';
import { FakeRoleRepository } from '../../entities/role/fake-repository.ts';
import { FakeIdentityRoleProvider } from '../../helpers/fake-identity-role-provider.ts';
import { describe, expect, it } from 'vitest';
import { resolveIntrospectionSubject } from '../../../../../src/core/oauth2/introspection/module.ts';
import { FakeIdentityPermissionProvider } from '../../helpers/fake-identity-permission-provider.ts';
import { FakeIdentityResolver } from '../../helpers/fake-identity-resolver.ts';

const userId = '245e3c5d-5747-4fbd-8554-c33d34780c58';
const realmId = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';
const clientId = 'c641912c-21e5-4cb4-84b6-169e2b2bb025';
const tokenClientId = 'c641912c-21e5-4cb4-84b6-169e2b2bb026';
const foreignRealmId = 'c641912c-21e5-4cb4-84b6-169e2b2bb024';

function setup() {
    const identityResolver = new FakeIdentityResolver();
    identityResolver.setIdentity({
        type: 'user',
        data: new FakeUserRepository().create({
            id: userId,
            name: 'user',
            realmId,
        }),
    });
    return {
        identityResolver,
        identityPermissionProvider: new FakeIdentityPermissionProvider(),
        permissionProvider: new PermissionMemoryProvider(),
    };
}

const input = {
    sub: userId,
    subKind: 'user',
    active: true,
} as const;

describe('introspection authorization export', () => {
    it('preserves namespaces, definition composition and each grant restriction through JSON', async () => {
        const ctx = setup();
        const permission = {
            name: 'read',
            clientId: null,
            realmId: null,
        };
        const nested = {
            type: 'composite',
            decisionStrategy: 'unanimous',
            children: [{ type: 'permissionBinding' }],
        };
        const restriction = { type: 'attributes', query: { visible: { $eq: true } } };
        ctx.permissionProvider.setMany([
            { permission, policies: [nested, { type: 'identity' }] },
            {
                permission: {
                    ...permission,
                    clientId,
                    realmId,
                },
            },
        ]);
        ctx.identityPermissionProvider.setBindings([
            { permission, realmScope: 'own' },
            {
                permission,
                realmScope: 'any',
                policies: [restriction],
            },
            {
                permission: {
                    ...permission,
                    clientId,
                    realmId,
                },
            },
            { permission: { name: 'missing' }, realmScope: 'any' },
        ]);

        const subject = await resolveIntrospectionSubject(ctx, { ...input, clientId: tokenClientId });
        expect(subject.authorization).toBeDefined();
        expect(JSON.parse(JSON.stringify(subject.authorization))).toEqual({
            version: 1,
            identity: {
                id: userId,
                type: 'user',
                realm_id: realmId,
                realm_name: null,
                client_id: null,
            },
            permissions: [
                {
                    name: 'read',
                    client_id: null,
                    realm_id: null,
                    policy: {
                        type: 'composite',
                        decisionStrategy: 'unanimous',
                        children: [nested, { type: 'identity' }],
                    },
                    grants: [{ realm_scope: 'own', policy: null }, { realm_scope: 'any', policy: restriction }],
                },
                {
                    name: 'read',
                    client_id: clientId,
                    realm_id: realmId,
                    policy: null,
                    grants: [{ realm_scope: 'own', policy: null }],
                },
            ],
        });
        expect(subject.permissions).toHaveLength(3);
        const evaluator = await createAuthorizationEvaluator(JSON.parse(JSON.stringify({
            active: true,
            kind: 'access_token',
            scope: 'global',
            authorization: subject.authorization,
        })));
        const resource = (resourceRealmId: string, visible: boolean) => new PolicyData({
            [BuiltInPolicyType.REALM_MATCH]: resourceRealmId,
            [BuiltInPolicyType.ATTRIBUTES]: { visible },
        });
        await expect(evaluator.evaluate({ name: 'read', data: resource(realmId, false) })).resolves.toBeUndefined();
        await expect(evaluator.evaluate({ name: 'read', data: resource(foreignRealmId, true) })).resolves.toBeUndefined();
        await expect(evaluator.evaluate({ name: 'read', data: resource(foreignRealmId, false) })).rejects.toThrow();
    });

    it('preserves a definition disjunction without imposing the grants as unconditional restrictions', async () => {
        const ctx = setup();
        const permission = { name: 'read' };
        const policies = [{ type: 'permissionBinding' }, { type: 'identity', types: ['user'] }];
        ctx.permissionProvider.setMany(policies.map((policy) => ({ permission, policies: [policy] })));
        ctx.identityPermissionProvider.setBindings([{ permission, realmScope: 'none' }]);
        const subject = await resolveIntrospectionSubject(ctx, input);
        expect(subject.authorization?.permissions[0]?.policy).toEqual({
            type: 'composite',
            decisionStrategy: 'affirmative',
            children: policies,
        });
    });

    it('exports grants for the resolved actor while preserving the token client legacy projection', async () => {
        const ctx = setup();
        ctx.identityResolver.setIdentity({
            type: 'user',
            data: new FakeUserRepository().create({
                id: userId,
                name: 'user',
                realmId,
                clientId,
            }),
        });
        const userRepository = new FakeUserRepository();
        const actorPermission = {
            name: 'read',
            clientId,
            realmId,
        };
        const tokenPermission = {
            name: 'read',
            clientId: tokenClientId,
            realmId,
        };
        userRepository.getBoundPermissions = async () => [
            { permission: actorPermission, realmScope: 'own' },
            { permission: tokenPermission, realmScope: 'any' },
        ];
        ctx.permissionProvider.setMany([
            { permission: actorPermission, policies: [{ type: 'permissionBinding' }] },
            { permission: tokenPermission, policies: [{ type: 'permissionBinding' }] },
        ]);
        const identityPermissionProvider = new IdentityPermissionProvider({
            userRepository,
            clientRepository: new FakeClientRepository(),
            roleRepository: new FakeRoleRepository(),
            roleProvider: new FakeIdentityRoleProvider(),
        });
        const subject = await resolveIntrospectionSubject({ ...ctx, identityPermissionProvider }, { ...input, clientId: tokenClientId });
        expect(subject.permissions).toEqual([{
            name: 'read',
            client_id: tokenClientId,
            realm_id: realmId,
        }]);
        expect(subject.authorization?.identity.client_id).toBe(clientId);
        expect(subject.authorization?.permissions).toEqual([{
            name: 'read',
            client_id: clientId,
            realm_id: realmId,
            policy: { type: 'permissionBinding' },
            grants: [{ realm_scope: 'own', policy: null }],
        }]);
    });

    it('retains a nested definition deny despite a passing unrestricted actor grant', async () => {
        const ctx = setup();
        const permission = { name: 'read' };
        ctx.identityPermissionProvider.setBindings([{ permission, realmScope: 'any' }]);
        const policy = {
            type: 'composite',
            decisionStrategy: 'unanimous',
            children: [
                { type: 'composite', children: [{ type: 'permissionBinding' }] },
                { type: 'attributes', query: { visible: { $eq: true } } },
            ],
        };
        ctx.permissionProvider.setMany([{ permission, policies: [policy] }]);
        const subject = await resolveIntrospectionSubject(ctx, input);
        const evaluator = await createAuthorizationEvaluator(JSON.parse(JSON.stringify({
            active: true,
            kind: 'access_token',
            scope: 'global',
            authorization: subject.authorization,
        })));
        for (const visible of [true, false]) {
            const evaluation = evaluator.evaluate({
                name: 'read',
                data: new PolicyData({
                    [BuiltInPolicyType.REALM_MATCH]: foreignRealmId,
                    [BuiltInPolicyType.ATTRIBUTES]: { visible },
                }),
            });
            if (visible) {
                await expect(evaluation).resolves.toBeUndefined();
            } else {
                await expect(evaluation).rejects.toThrow();
            }
        }
    });

    it('does not read authorization for an inactive credential', async () => {
        const ctx = setup();
        ctx.identityPermissionProvider.getFor = async () => { throw new Error('Unexpected grant read'); };
        ctx.permissionProvider.findOne = async () => { throw new Error('Unexpected definition read'); };
        const subject = await resolveIntrospectionSubject(ctx, { ...input, active: false });
        expect(subject.authorization).toBeUndefined();
        expect(subject.permissions).toBeUndefined();
    });
});
