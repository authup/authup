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
import { AUTHORIZATION_POLICY_WITHHELD_TYPE } from '@authup/access';
import { createNoopLogger } from '@authup/server-kit';
import { buildAuthorizationCatalog } from '../../../../src/core/authorization/module.ts';
import type { PermissionPolicies } from '../../../../src/core/authorization/types.ts';
import { FakeAuthorizationCatalogRepository } from '../helpers/fake-authorization-catalog-repository.ts';

const realmId = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';
const clientId = 'c641912c-21e5-4cb4-84b6-169e2b2bb025';

// every fixture carries `realmId`, the way a row a repository hands over does:
// the builder treats a node without the column as one it cannot place
const systemDefault = {
    id: 'policy-default',
    name: 'system.default',
    realmId: null,
    builtIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    type: 'composite',
    decisionStrategy: 'unanimous',
    children: [
        {
            id: 'policy-identity',
            realmId: null,
            type: 'identity',
            builtIn: true,
        },
        {
            id: 'policy-binding',
            realmId: null,
            type: 'permissionBinding',
            builtIn: true,
        },
    ],
};
const visible = {
    id: 'policy-visible',
    name: 'only-visible',
    realmId: null,
    type: 'attributes',
    query: { visible: { $eq: true } },
};

function setup() {
    const logger = createNoopLogger();

    return {
        catalogRepository: new FakeAuthorizationCatalogRepository(),
        logger,
        warn: vi.spyOn(logger, 'warn'),
    };
}

const reachAll = async () => true;

function build(
    ctx: ReturnType<typeof setup>,
    canReachRealm: (realmId: string | null) => Promise<boolean> = reachAll,
) {
    return buildAuthorizationCatalog(ctx, canReachRealm);
}

const globalPermission = (name: string) => ({
    name,
    realmId: null,
    clientId: null,
});

const bindingDefinition = (name: string) : PermissionPolicies => [globalPermission(name), [systemDefault]];

const custom = {
    id: 'policy-custom', 
    realmId: null, 
    type: 'myType', 
};
const scoped = {
    id: 'policy-scoped', 
    type: 'identity', 
    realmId, 
};
const mixed = {
    id: 'policy-mixed',
    type: 'composite',
    decisionStrategy: 'unanimous',
    children: [{
        id: 'policy-identity', 
        realmId: null, 
        type: 'identity', 
    }, scoped],
};
const realmless = { id: 'policy-realmless', type: 'identity' };
const prototypeNamed = {
    id: 'constructor', 
    realmId: null, 
    type: 'identity', 
};
const prototypePolluting = {
    id: '__proto__', 
    realmId: null, 
    type: 'identity', 
};

describe('core/authorization/module', () => {
    it('emits every definition with its trees deduped and sorted by namespace', async () => {
        const ctx = setup();
        ctx.catalogRepository.setDefinitions([
            [
                {
                    name: 'write',
                    realmId: null,
                    clientId: null,
                    decisionStrategy: null,
                },
                [systemDefault],
            ],
            [
                {
                    name: 'read',
                    realmId,
                    clientId,
                    decisionStrategy: null,
                },
                [visible],
            ],
            [
                {
                    name: 'read',
                    realmId: null,
                    clientId: null,
                    decisionStrategy: 'unanimous',
                },
                [systemDefault, visible],
            ],
        ]);

        const catalog = await build(ctx);

        expect(JSON.parse(JSON.stringify(catalog))).toEqual({
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
        const catalog = await build(setup());
        expect(catalog).toEqual({
            policies: {},
            permissions: [],
        });
    });

    it('carries a definition whose tree carries no id without its policies and warns once', async () => {
        const ctx = setup();
        ctx.catalogRepository.setDefinitions([
            [globalPermission('read'), [{ type: 'identity' }]],
            bindingDefinition('write'),
        ]);

        const catalog = await build(ctx);

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
        ctx.catalogRepository.setDefinitions([
            [globalPermission('read'), [custom]],
            bindingDefinition('write'),
        ]);

        const catalog = await build(ctx);

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
        ctx.catalogRepository.setDefinitions([
            [globalPermission('read'), [prototypeNamed]],
        ]);

        const catalog = await build(ctx);

        expect(catalog.permissions[0]!.policies).toEqual(['constructor']);
        expect(Object.entries(catalog.policies)).toEqual([['constructor', { type: 'identity' }]]);
        expect(ctx.warn).not.toHaveBeenCalled();
    });

    // A plain object would take `__proto__` as a prototype assignment rather
    // than an own entry, so the definition would name a policy the catalog
    // does not carry and every consumer would read it as stale.
    it('projects a policy whose id is named __proto__', async () => {
        const ctx = setup();
        ctx.catalogRepository.setDefinitions([
            [globalPermission('read'), [prototypePolluting]],
        ]);

        const catalog = await build(ctx);

        expect(catalog.permissions[0]!.policies).toEqual(['__proto__']);
        expect(Object.hasOwn(catalog.policies, '__proto__')).toBe(true);
        expect(Object.entries(catalog.policies)).toEqual([['__proto__', { type: 'identity' }]]);
        expect(Object.getPrototypeOf({})).toEqual(Object.prototype);
        expect(ctx.warn).not.toHaveBeenCalled();
    });

    it('carries every grant policy once, deduped against the definition trees', async () => {
        const ctx = setup();
        ctx.catalogRepository.setDefinitions([bindingDefinition('read')]);
        ctx.catalogRepository.setGrantPolicies([systemDefault, visible, prototypeNamed]);

        const catalog = await build(ctx);

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
        ctx.catalogRepository.setDefinitions([bindingDefinition('read')]);
        ctx.catalogRepository.setGrantPolicies([custom, { type: 'identity' }, visible]);

        const catalog = await build(ctx);

        expect(Object.keys(catalog.policies).sort()).toEqual(['policy-default', 'policy-visible']);
        expect(catalog.permissions.map((permission) => permission.name)).toEqual(['read']);
        expect(ctx.warn).toHaveBeenCalledTimes(2);
        expect(String(ctx.warn.mock.calls[0]![0])).toContain('policy-custom');
        expect(String(ctx.warn.mock.calls[1]![0])).toContain('must carry its id');
    });
    // The realm reach of the caller's own read grant, the gate `GET /permissions`
    // and `GET /policies` apply to the same rows. What it removes is the policy
    // configuration, never an entry: an absent definition has to keep meaning
    // that the consumer's copy is older than the definition.
    it('carries a definition of a realm out of reach without its policies', async () => {
        const ctx = setup();
        ctx.catalogRepository.setDefinitions([
            [{
                name: 'read', 
                realmId, 
                clientId: null, 
            }, [systemDefault]],
            bindingDefinition('write'),
        ]);

        const catalog = await build(ctx, async (realm) => realm !== realmId);

        expect(catalog.permissions).toEqual([
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
                client_id: null,
                decision_strategy: null,
                policies: null,
            },
        ]);
        // the tree itself is global, so the reachable definition still carries it
        expect(catalog.policies).toHaveProperty('policy-default');
    });

    it('withholds a policy tree out of reach and denies the definition naming it', async () => {
        const ctx = setup();
        ctx.catalogRepository.setDefinitions([
            [globalPermission('read'), [scoped]],
            bindingDefinition('write'),
        ]);

        const catalog = await build(ctx, async (realm) => realm !== realmId);

        expect(catalog.permissions.map((permission) => [permission.name, permission.policies]))
            .toEqual([['read', null], ['write', ['policy-default']]]);
        expect(catalog.policies['policy-scoped']).toEqual({ type: AUTHORIZATION_POLICY_WITHHELD_TYPE });
        expect(catalog.policies['policy-default']).toHaveProperty('type', 'composite');
    });

    // A child row carries its own realm and nothing pins it to its parent's, so
    // a reachable composite can hold one the caller may not read, and the
    // child's configuration travels inside the parent's projection.
    it('withholds a tree whose child sits in a realm out of reach', async () => {
        const ctx = setup();
        ctx.catalogRepository.setDefinitions([
            [globalPermission('read'), [mixed]],
        ]);

        const catalog = await build(ctx, async (realm) => realm !== realmId);

        expect(catalog.permissions[0]!.policies).toBeNull();
        expect(catalog.policies['policy-mixed']).toEqual({ type: AUTHORIZATION_POLICY_WITHHELD_TYPE });
    });

    // present but unevaluable, so a consumer drops the grant naming it. Absent
    // it would read as a stale catalog and cost a refetch that changes nothing.
    // a node the builder cannot place is not global: it is one this build has
    // no realm for, so it is withheld rather than offered to every reader
    it('withholds a tree whose node carries no realm at all', async () => {
        const ctx = setup();
        ctx.catalogRepository.setDefinitions([
            [globalPermission('read'), [realmless]],
        ]);

        const catalog = await build(ctx);

        expect(catalog.permissions[0]!.policies).toBeNull();
        expect(catalog.policies['policy-realmless']).toEqual({ type: AUTHORIZATION_POLICY_WITHHELD_TYPE });
    });

    it('withholds a grant policy out of reach', async () => {
        const ctx = setup();
        ctx.catalogRepository.setDefinitions([bindingDefinition('read')]);
        ctx.catalogRepository.setGrantPolicies([scoped, visible]);

        const catalog = await build(ctx, async (realm) => realm !== realmId);

        expect(catalog.policies['policy-scoped']).toEqual({ type: AUTHORIZATION_POLICY_WITHHELD_TYPE });
        expect(catalog.policies['policy-visible']).toEqual({ type: 'attributes', query: { visible: { $eq: true } } });
        expect(ctx.warn).not.toHaveBeenCalled();
    });
});
