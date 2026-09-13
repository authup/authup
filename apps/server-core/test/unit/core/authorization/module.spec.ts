/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { 
    describe, 
    expect, 
    it, 
    vi, 
} from 'vitest';
import { InternalError } from '@authup/errors';
import { createNoopLogger } from '@authup/server-kit';
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
    const logger = createNoopLogger();

    return {
        identityPermissionProvider: new FakeIdentityPermissionProvider(),
        permissionDefinitionProvider: new FakePermissionDefinitionProvider(),
        logger,
        warn: vi.spyOn(logger, 'warn'),
    };
}

const globalPermission = (name: string) => ({
    name,
    realmId: null,
    clientId: null,
});

const bindingDefinition = (name: string) => ({
    permission: globalPermission(name),
    policies: [systemDefault],
});

const custom = { id: 'policy-custom', type: 'myType' };
const bindingGrant = {
    id: 'p-bind',
    type: 'composite',
    decisionStrategy: 'unanimous',
    children: [{ id: 'c1', type: 'permissionBinding' }],
};
const prototypeNamed = { id: 'constructor', type: 'identity' };

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

    it('refuses an identity that is neither user nor client', async () => {
        await expect(buildAuthorizationDocument(setup(), { ...identity, type: 'role' }))
            .rejects.toBeInstanceOf(InternalError);
    });

    it('drops a permission whose definition tree carries no id and warns once', async () => {
        const ctx = setup();
        ctx.permissionDefinitionProvider.setDefinitions([
            { permission: globalPermission('read'), policies: [{ type: 'identity' }] },
            bindingDefinition('write'),
        ]);
        ctx.identityPermissionProvider.setBindings([
            { permission: globalPermission('read'), realmScope: 'any' },
            { permission: globalPermission('write'), realmScope: 'any' },
        ]);

        const document = await buildAuthorizationDocument(ctx, identity);

        expect(document.permissions.map((permission) => permission.name)).toEqual(['write']);
        expect(ctx.warn).toHaveBeenCalledTimes(1);
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('read');
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('must carry its id');
    });

    it('drops a permission whose definition policy is not a built-in type and keeps its sibling', async () => {
        const ctx = setup();
        ctx.permissionDefinitionProvider.setDefinitions([
            { permission: globalPermission('read'), policies: [custom] },
            bindingDefinition('write'),
        ]);
        ctx.identityPermissionProvider.setBindings([
            { permission: globalPermission('read'), realmScope: 'any' },
            { permission: globalPermission('write'), realmScope: 'any' },
        ]);

        const document = await buildAuthorizationDocument(ctx, identity);

        expect(document.permissions.map((permission) => permission.name)).toEqual(['write']);
        expect(document.policies).not.toHaveProperty('policy-custom');
        expect(ctx.warn).toHaveBeenCalledTimes(1);
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('read');
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('policy-custom');
    });

    it('drops an unprojectable grant alone, and the permission once no grant is left', async () => {
        const ctx = setup();
        ctx.permissionDefinitionProvider.setDefinitions([
            bindingDefinition('read'),
            bindingDefinition('write'),
        ]);
        ctx.identityPermissionProvider.setBindings([
            { permission: globalPermission('read'), realmScope: 'own' },
            {
                permission: globalPermission('read'),
                realmScope: 'any',
                policies: [custom],
            },
            {
                permission: globalPermission('write'),
                realmScope: 'any',
                policies: [custom],
            },
        ]);

        const document = await buildAuthorizationDocument(ctx, identity);

        expect(document.permissions).toEqual([
            {
                name: 'read',
                realm_id: null,
                client_id: null,
                decision_strategy: null,
                policies: ['policy-default'],
                grants: [{ realm_scope: 'own', policies: [] }],
            },
        ]);
        expect(document.policies).not.toHaveProperty('policy-custom');
        expect(ctx.warn).toHaveBeenCalledTimes(2);
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('read');
        expect(String(ctx.warn.mock.calls[1]![0])).toContain('write');
    });

    it('drops a grant whose policy carries a permission binding node while the definition keeps it', async () => {
        const ctx = setup();
        ctx.permissionDefinitionProvider.setDefinitions([bindingDefinition('read')]);
        ctx.identityPermissionProvider.setBindings([
            { permission: globalPermission('read'), realmScope: 'own' },
            {
                permission: globalPermission('read'),
                realmScope: 'any',
                policies: [bindingGrant],
            },
        ]);

        const document = await buildAuthorizationDocument(ctx, identity);

        expect(document.permissions).toHaveLength(1);
        expect(document.permissions[0]!.policies).toEqual(['policy-default']);
        expect(document.permissions[0]!.grants).toEqual([{ realm_scope: 'own', policies: [] }]);
        expect(document.policies).toHaveProperty('policy-default');
        expect(document.policies).not.toHaveProperty('p-bind');
        expect(ctx.warn).toHaveBeenCalledTimes(1);
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('p-bind');
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('carries a permissionBinding node');
    });

    it('projects a policy whose id is named constructor', async () => {
        const ctx = setup();
        ctx.permissionDefinitionProvider.setDefinitions([
            { permission: globalPermission('read'), policies: [prototypeNamed] },
        ]);
        ctx.identityPermissionProvider.setBindings([
            { permission: globalPermission('read'), realmScope: 'any' },
        ]);

        const document = await buildAuthorizationDocument(ctx, identity);

        expect(document.permissions[0]!.policies).toEqual(['constructor']);
        expect(Object.entries(document.policies)).toEqual([['constructor', { type: 'identity' }]]);
        expect(ctx.warn).not.toHaveBeenCalled();
    });
});
