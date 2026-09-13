/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { buildAuthorizationDocument } from '../../../../src/core/authorization/module.ts';
import { FakeIdentityPermissionProvider } from '../helpers/fake-identity-permission-provider.ts';
import { FakePermissionDefinitionProvider } from '../helpers/fake-permission-definition-provider.ts';

const userId = '245e3c5d-5747-4fbd-8554-c33d34780c58';
const realmId = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';
const clientId = 'c641912c-21e5-4cb4-84b6-169e2b2bb025';

const systemDefault = {
    id: 'policy-default',
    name: 'system.default',
    builtIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    type: 'composite',
    decisionStrategy: 'unanimous',
    children: [
        {
            id: 'policy-identity',
            type: 'identity',
            builtIn: true,
        },
        {
            id: 'policy-binding',
            type: 'permissionBinding',
            builtIn: true,
        },
    ],
};
const visible = {
    id: 'policy-visible',
    name: 'only-visible',
    type: 'attributes',
    query: { visible: { $eq: true } },
};

function setup() {
    return {
        identityPermissionProvider: new FakeIdentityPermissionProvider(),
        permissionDefinitionProvider: new FakePermissionDefinitionProvider(),
    };
}

const identity = {
    type: 'user',
    id: userId,
    realmId,
    realmName: 'master',
    clientId: null,
} as const;

describe('core/authorization/module', () => {
    it('emits every referenced tree once and references it from definitions and grants', async () => {
        const ctx = setup();
        ctx.permissionDefinitionProvider.setDefinitions([
            {
                permission: {
                    name: 'read',
                    realmId: null,
                    clientId: null,
                    decisionStrategy: 'unanimous',
                },
                policies: [systemDefault],
            },
            {
                permission: {
                    name: 'write',
                    realmId: null,
                    clientId: null,
                    decisionStrategy: null,
                },
                policies: [systemDefault],
            },
            {
                permission: {
                    name: 'read',
                    realmId,
                    clientId,
                    decisionStrategy: null,
                },
                policies: [],
            },
        ]);
        ctx.identityPermissionProvider.setBindings([
            {
                permission: {
                    name: 'read',
                    realmId: null,
                    clientId: null,
                },
                realmScope: 'own',
            },
            {
                permission: {
                    name: 'read',
                    realmId: null,
                    clientId: null,
                },
                realmScope: 'any',
                policies: [visible],
            },
            {
                permission: {
                    name: 'write',
                    realmId: null,
                    clientId: null,
                },
            },
            {
                permission: {
                    name: 'read',
                    realmId,
                    clientId,
                },
                realmScope: 'own',
            },
            {
                permission: {
                    name: 'missing',
                    realmId: null,
                    clientId: null,
                },
                realmScope: 'any',
            },
        ]);

        const document = await buildAuthorizationDocument(ctx, identity);

        expect(JSON.parse(JSON.stringify(document))).toEqual({
            version: 1,
            identity: {
                id: userId,
                type: 'user',
                realm_id: realmId,
                realm_name: 'master',
                client_id: null,
            },
            policies: {
                'policy-default': {
                    type: 'composite',
                    decisionStrategy: 'unanimous',
                    children: [{ type: 'identity' }, { type: 'permissionBinding' }],
                },
                'policy-visible': { type: 'attributes', query: { visible: { $eq: true } } },
            },
            permissions: [
                {
                    name: 'read',
                    realm_id: null,
                    client_id: null,
                    decision_strategy: 'unanimous',
                    policies: ['policy-default'],
                    grants: [
                        { realm_scope: 'own', policies: [] },
                        { realm_scope: 'any', policies: ['policy-visible'] },
                    ],
                },
                {
                    name: 'write',
                    realm_id: null,
                    client_id: null,
                    decision_strategy: null,
                    policies: ['policy-default'],
                    grants: [{ realm_scope: 'own', policies: [] }],
                },
                {
                    name: 'read',
                    realm_id: realmId,
                    client_id: clientId,
                    decision_strategy: null,
                    policies: [],
                    grants: [{ realm_scope: 'own', policies: [] }],
                },
            ],
        });
    });

    it('answers no permissions for an identity without bindings', async () => {
        const ctx = setup();
        const document = await buildAuthorizationDocument(ctx, identity);
        expect(document.permissions).toEqual([]);
        expect(document.policies).toEqual({});
    });

    it('refuses a policy tree that carries no id and an identity that is neither user nor client', async () => {
        const ctx = setup();
        ctx.permissionDefinitionProvider.setDefinitions([
            {
                permission: {
                    name: 'read',
                    realmId: null,
                    clientId: null,
                },
                policies: [{ type: 'identity' }],
            },
        ]);
        ctx.identityPermissionProvider.setBindings([
            {
                permission: {
                    name: 'read',
                    realmId: null,
                    clientId: null,
                },
                realmScope: 'any',
            },
        ]);
        await expect(buildAuthorizationDocument(ctx, identity)).rejects.toThrow();

        await expect(buildAuthorizationDocument(setup(), { ...identity, type: 'role' })).rejects.toThrow();
    });
});
