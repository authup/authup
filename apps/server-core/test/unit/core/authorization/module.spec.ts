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
import { FakeAuthorizationCatalogSource } from '../helpers/fake-authorization-catalog-source.ts';

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
        catalogSource: new FakeAuthorizationCatalogSource(),
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
const prototypePolluting = { id: '__proto__', type: 'identity' };

describe('core/authorization/module', () => {
    it('emits every definition with its trees deduped and sorted by namespace', async () => {
        const ctx = setup();
        ctx.catalogSource.setDefinitions([
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

    it('carries a definition whose tree carries no id without its policies and warns once', async () => {
        const ctx = setup();
        ctx.catalogSource.setDefinitions([
            { permission: globalPermission('read'), policies: [{ type: 'identity' }] },
            bindingDefinition('write'),
        ]);

        const catalog = await buildAuthorizationCatalog(ctx);

        // the definition is real, so its absence would read as a stale copy
        // to a consumer holding a grant of it; carried with policies: null
        // the consumer denies it and drops the grant instead
        expect(catalog.permissions).toEqual([
            {
                name: 'read',
                realm_id: null,
                client_id: null,
                decision_strategy: null,
                policies: null,
            },
            {
                name: 'write',
                realm_id: null,
                client_id: null,
                decision_strategy: null,
                policies: ['policy-default'],
            },
        ]);
        expect(ctx.warn).toHaveBeenCalledTimes(1);
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('read');
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('must carry its id');
    });

    it('carries a definition whose policy is not a built-in type without its policies and keeps its sibling', async () => {
        const ctx = setup();
        ctx.catalogSource.setDefinitions([
            { permission: globalPermission('read'), policies: [custom] },
            bindingDefinition('write'),
        ]);

        const catalog = await buildAuthorizationCatalog(ctx);

        expect(catalog.permissions.map((permission) => [permission.name, permission.policies]))
            .toEqual([['read', null], ['write', ['policy-default']]]);
        expect(catalog.policies).not.toHaveProperty('policy-custom');
        expect(catalog.policies).toHaveProperty('policy-default');
        expect(ctx.warn).toHaveBeenCalledTimes(1);
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('read');
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('policy-custom');
    });

    it('projects a policy whose id is named constructor', async () => {
        const ctx = setup();
        ctx.catalogSource.setDefinitions([
            { permission: globalPermission('read'), policies: [prototypeNamed] },
        ]);

        const catalog = await buildAuthorizationCatalog(ctx);

        expect(catalog.permissions[0]!.policies).toEqual(['constructor']);
        expect(Object.entries(catalog.policies)).toEqual([['constructor', { type: 'identity' }]]);
        expect(ctx.warn).not.toHaveBeenCalled();
    });

    // A plain object would take `__proto__` as a prototype assignment rather
    // than an own entry, so the definition would name a policy the catalog
    // does not carry and every consumer would read it as stale.
    it('projects a policy whose id is named __proto__', async () => {
        const ctx = setup();
        ctx.catalogSource.setDefinitions([
            { permission: globalPermission('read'), policies: [prototypePolluting] },
        ]);

        const catalog = await buildAuthorizationCatalog(ctx);

        expect(catalog.permissions[0]!.policies).toEqual(['__proto__']);
        expect(Object.hasOwn(catalog.policies, '__proto__')).toBe(true);
        expect(Object.entries(catalog.policies)).toEqual([['__proto__', { type: 'identity' }]]);
        expect(Object.getPrototypeOf({})).toEqual(Object.prototype);
        expect(ctx.warn).not.toHaveBeenCalled();
    });

    it('carries every grant policy once, deduped against the definition trees', async () => {
        const ctx = setup();
        ctx.catalogSource.setDefinitions([bindingDefinition('read')]);
        ctx.catalogSource.setGrantPolicies([systemDefault, visible, prototypeNamed]);

        const catalog = await buildAuthorizationCatalog(ctx);

        expect(Object.keys(catalog.policies).sort()).toEqual(['constructor', 'policy-default', 'policy-visible']);
        expect(catalog.policies['policy-visible']).toEqual({ type: 'attributes', query: { visible: { $eq: true } } });
        expect(catalog.permissions).toEqual([
            {
                name: 'read',
                realm_id: null,
                client_id: null,
                decision_strategy: null,
                policies: ['policy-default'],
            },
        ]);
        expect(ctx.warn).not.toHaveBeenCalled();
    });

    it('drops a grant policy the catalog cannot carry, warns per drop and keeps the rest', async () => {
        const ctx = setup();
        ctx.catalogSource.setDefinitions([bindingDefinition('read')]);
        ctx.catalogSource.setGrantPolicies([custom, { type: 'identity' }, visible]);

        const catalog = await buildAuthorizationCatalog(ctx);

        expect(Object.keys(catalog.policies).sort()).toEqual(['policy-default', 'policy-visible']);
        expect(catalog.permissions.map((permission) => permission.name)).toEqual(['read']);
        expect(ctx.warn).toHaveBeenCalledTimes(2);
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('policy-custom');
        expect(String(ctx.warn.mock.calls[1]![0])).toContain('must carry its id');
    });
});
