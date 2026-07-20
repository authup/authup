/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmScope } from '@authup/access';
import { Container } from 'eldin';
import {
    describe, 
    expect, 
    it,
} from 'vitest';
import { CompositeProvisioningSource } from '../../../../../src/app/modules/provisioning/sources/index.ts';
import type { RootProvisioningEntity } from '../../../../../src/core/provisioning/entities/index.ts';
import { ProvisioningEntityStrategyType } from '../../../../../src/core/provisioning/strategy/index.ts';
import type { IProvisioningSource } from '../../../../../src/core/provisioning/types.ts';

const container = new Container();

function createSource(data: RootProvisioningEntity) : IProvisioningSource {
    return { load: async () => data };
}

async function loadComposite(...sources: RootProvisioningEntity[]) : Promise<RootProvisioningEntity> {
    const composite = new CompositeProvisioningSource(sources.map((data) => createSource(data)));
    return composite.load(container);
}

describe('app/modules/provisioning/sources/composite', () => {
    it('should union realm relations when a later source redefines the realm', async () => {
        // regression: a mounted provisioning file declaring the master realm
        // (to attach one client) must not displace the default source's
        // admin user / system client relations.
        const output = await loadComposite(
            {
                realms: [{
                    strategy: {
                        type: ProvisioningEntityStrategyType.MERGE,
                        attributes: ['builtIn'],
                    },
                    attributes: { name: 'master', builtIn: true },
                    relations: {
                        users: [{
                            attributes: { name: 'admin' },
                            relations: { globalRoles: ['admin'] },
                        }],
                        clients: [{ attributes: { name: 'system' } }],
                    },
                }],
            },
            {
                realms: [{
                    attributes: { name: 'master' },
                    relations: { clients: [{ attributes: { name: 'registry' } }] },
                }],
            },
        );

        expect(output.realms).toHaveLength(1);

        const [realm] = output.realms!;
        expect(realm.attributes.builtIn).toBe(true);
        expect(realm.strategy?.type).toEqual(ProvisioningEntityStrategyType.MERGE);
        expect(realm.relations?.users).toHaveLength(1);
        expect(realm.relations?.users![0].attributes.name).toEqual('admin');
        expect(realm.relations?.clients!.map((client) => client.attributes.name))
            .toEqual(['system', 'registry']);
    });

    it('should let the later source win per attribute while keeping earlier attributes', async () => {
        const output = await loadComposite(
            {
                scopes: [{
                    attributes: {
                        name: 'scope', 
                        builtIn: true, 
                        description: 'first', 
                    }, 
                }],
            },
            { scopes: [{ attributes: { name: 'scope', description: 'second' } }] },
        );

        expect(output.scopes).toHaveLength(1);
        expect(output.scopes![0].attributes.builtIn).toBe(true);
        expect(output.scopes![0].attributes.description).toEqual('second');
    });

    it('should deep-merge colliding entries inside relations', async () => {
        const output = await loadComposite(
            {
                realms: [{
                    attributes: { name: 'master' },
                    relations: {
                        clients: [{
                            attributes: { name: 'system', builtIn: true },
                            relations: { globalRoles: ['admin'] },
                        }],
                    },
                }],
            },
            {
                realms: [{
                    attributes: { name: 'master' },
                    relations: {
                        clients: [{
                            attributes: { name: 'system', active: true },
                            relations: { globalRoles: ['service'] },
                        }],
                    },
                }],
            },
        );

        const [client] = output.realms![0].relations!.clients!;
        expect(client.attributes.builtIn).toBe(true);
        expect(client.attributes.active).toBe(true);
        expect(client.relations?.globalRoles).toEqual(['admin', 'service']);
    });

    it('should union scalar relation lists without duplicates', async () => {
        const output = await loadComposite(
            {
                roles: [{
                    attributes: { name: 'role' },
                    relations: { globalPermissions: ['a', 'b'] },
                }],
            },
            {
                roles: [{
                    attributes: { name: 'role' },
                    relations: { globalPermissions: ['b', 'c'] },
                }],
            },
        );

        expect(output.roles![0].relations?.globalPermissions).toEqual(['a', 'b', 'c']);
    });

    it('should merge record-shaped relations per key and replace scalars', async () => {
        const output = await loadComposite(
            {
                roles: [{
                    attributes: { name: 'role' },
                    relations: {
                        globalPermissionsRealmScope: RealmScope.OWN,
                        globalPermissionsRealmScopeOverrides: { [RealmScope.OWN]: ['a'] },
                    },
                }],
            },
            {
                roles: [{
                    attributes: { name: 'role' },
                    relations: {
                        globalPermissionsRealmScope: RealmScope.ANY,
                        globalPermissionsRealmScopeOverrides: {
                            [RealmScope.OWN]: ['b'],
                            [RealmScope.ANY]: ['c'],
                        },
                    },
                }],
            },
        );

        const [role] = output.roles!;
        expect(role.relations?.globalPermissionsRealmScope).toEqual(RealmScope.ANY);
        expect(role.relations?.globalPermissionsRealmScopeOverrides).toEqual({
            [RealmScope.OWN]: ['a', 'b'],
            [RealmScope.ANY]: ['c'],
        });
    });

    it('should keep entries with distinct composite keys separate', async () => {
        const output = await loadComposite(
            { permissions: [{ attributes: { name: 'permission', realmId: null } }] },
            { permissions: [{ attributes: { name: 'permission', realmId: '2fa38a48-4497-408d-9184-b2f213b58017' } }] },
        );

        expect(output.permissions).toHaveLength(2);
    });

    it('should let a later strategy replace an earlier one', async () => {
        const output = await loadComposite(
            {
                scopes: [{
                    strategy: { type: ProvisioningEntityStrategyType.CREATE_ONLY },
                    attributes: { name: 'scope' },
                }],
            },
            {
                scopes: [{
                    strategy: { type: ProvisioningEntityStrategyType.REPLACE },
                    attributes: { name: 'scope' },
                }],
            },
        );

        expect(output.scopes![0].strategy?.type).toEqual(ProvisioningEntityStrategyType.REPLACE);
    });

    it('should merge policy children and extra attributes', async () => {
        const output = await loadComposite(
            {
                policies: [{
                    attributes: { name: 'policy' },
                    extraAttributes: { invert: true },
                    children: [{ attributes: { name: 'child-a' } }],
                }],
            },
            {
                policies: [{
                    attributes: { name: 'policy' },
                    extraAttributes: { names: ['x'] },
                    children: [{ attributes: { name: 'child-b' } }],
                }],
            },
        );

        const [policy] = output.policies!;
        expect(policy.extraAttributes).toEqual({ invert: true, names: ['x'] });
        expect(policy.children!.map((child) => child.attributes.name))
            .toEqual(['child-a', 'child-b']);
    });

    it('should append entries without a composite key', async () => {
        const output = await loadComposite(
            { scopes: [{ attributes: { name: 'scope' } }] },
            { scopes: [{ attributes: {} }] },
        );

        expect(output.scopes).toHaveLength(2);
    });
});
