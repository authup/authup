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
import { createNoopLogger } from '@authup/server-kit';
import { buildAuthorizationCatalog } from '../../../../src/core/authorization/module.ts';
import { FakePermissionDefinitionProvider } from '../helpers/fake-permission-definition-provider.ts';

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
const prototypeNamed = { id: 'constructor', type: 'identity' };

describe('core/authorization/module', () => {
    it('emits every definition with its trees deduped and sorted by namespace', async () => {
        const ctx = setup();
        ctx.permissionDefinitionProvider.setDefinitions([
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
                policies: [visible],
            },
            {
                permission: {
                    name: 'read',
                    realmId: null,
                    clientId: null,
                    decisionStrategy: 'unanimous',
                },
                policies: [systemDefault, visible],
            },
        ]);

        const catalog = await buildAuthorizationCatalog(ctx);

        expect(JSON.parse(JSON.stringify(catalog))).toEqual({
            version: 1,
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
                    policies: ['policy-default', 'policy-visible'],
                },
                {
                    name: 'write',
                    realm_id: null,
                    client_id: null,
                    decision_strategy: null,
                    policies: ['policy-default'],
                },
                {
                    name: 'read',
                    realm_id: realmId,
                    client_id: clientId,
                    decision_strategy: null,
                    policies: ['policy-visible'],
                },
            ],
        });
        expect(catalog).not.toHaveProperty('identity');
        expect(JSON.stringify(catalog)).not.toContain('grants');
        expect(ctx.warn).not.toHaveBeenCalled();
    });

    it('answers an empty catalog when nothing is defined', async () => {
        const catalog = await buildAuthorizationCatalog(setup());
        expect(catalog).toEqual({
            version: 1,
            policies: {},
            permissions: [],
        });
    });

    it('drops a definition whose tree carries no id and warns once', async () => {
        const ctx = setup();
        ctx.permissionDefinitionProvider.setDefinitions([
            { permission: globalPermission('read'), policies: [{ type: 'identity' }] },
            bindingDefinition('write'),
        ]);

        const catalog = await buildAuthorizationCatalog(ctx);

        expect(catalog.permissions.map((permission) => permission.name)).toEqual(['write']);
        expect(ctx.warn).toHaveBeenCalledTimes(1);
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('read');
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('must carry its id');
    });

    it('drops a definition whose policy is not a built-in type and keeps its sibling', async () => {
        const ctx = setup();
        ctx.permissionDefinitionProvider.setDefinitions([
            { permission: globalPermission('read'), policies: [custom] },
            bindingDefinition('write'),
        ]);

        const catalog = await buildAuthorizationCatalog(ctx);

        expect(catalog.permissions.map((permission) => permission.name)).toEqual(['write']);
        expect(catalog.policies).not.toHaveProperty('policy-custom');
        expect(catalog.policies).toHaveProperty('policy-default');
        expect(ctx.warn).toHaveBeenCalledTimes(1);
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('read');
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('policy-custom');
    });

    it('projects a policy whose id is named constructor', async () => {
        const ctx = setup();
        ctx.permissionDefinitionProvider.setDefinitions([
            { permission: globalPermission('read'), policies: [prototypeNamed] },
        ]);

        const catalog = await buildAuthorizationCatalog(ctx);

        expect(catalog.permissions[0]!.policies).toEqual(['constructor']);
        expect(Object.entries(catalog.policies)).toEqual([['constructor', { type: 'identity' }]]);
        expect(ctx.warn).not.toHaveBeenCalled();
    });
});
