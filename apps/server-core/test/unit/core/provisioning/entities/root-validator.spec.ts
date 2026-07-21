/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, RealmScope } from '@authup/access';
import { ValidatorGroup } from '@authup/kit';
import { describe, expect, it } from 'vitest';
import { RootProvisioningValidator } from '../../../../../src/core/provisioning/entities';

const validator = new RootProvisioningValidator();
const run = (data: Record<string, any>) => validator.run(data, { group: ValidatorGroup.PROVISIONING });

describe('core/provisioning/entities/root-validator', () => {
    it('should reject a non-string entity name', async () => {
        await expect(run({ roles: [{ attributes: { name: 123 } }] })).rejects.toThrow();
    });

    it('should reject a too-short entity name', async () => {
        await expect(run({ roles: [{ attributes: { name: 'ab' } }] })).rejects.toThrow();
    });

    it('should reject a missing entity name', async () => {
        await expect(run({ roles: [{ attributes: { displayName: 'No Name' } }] })).rejects.toThrow();
    });

    it('should reject an invalid nested realm-relation entity', async () => {
        await expect(run({
            realms: [
                {
                    attributes: { name: 'foo' },
                    relations: { users: [{ attributes: { name: 'x' } }] },
                },
            ],
        })).rejects.toThrow();
    });

    it('should canonicalize entity names in the run output', async () => {
        const output = await run({ roles: [{ attributes: { name: ' FOO ' } }] });

        expect(output.roles![0].attributes.name).toEqual('foo');
    });

    it('should preserve builtIn in the run output', async () => {
        const output = await run({
            roles: [{ attributes: { name: 'foo', builtIn: true } }],
            permissions: [{ attributes: { name: 'foo', builtIn: true } }],
            scopes: [{ attributes: { name: 'foo', builtIn: true } }],
            realms: [
                {
                    attributes: { name: 'foo', builtIn: true },
                    relations: { clients: [{ attributes: { name: 'foo', builtIn: true } }] },
                },
            ],
        });

        expect(output.roles![0].attributes.builtIn).toBe(true);
        expect(output.permissions![0].attributes.builtIn).toBe(true);
        expect(output.scopes![0].attributes.builtIn).toBe(true);
        expect(output.realms![0].attributes.builtIn).toBe(true);
        expect(output.realms![0].relations!.clients![0].attributes.builtIn).toBe(true);
    });

    it('should strip unmounted attribute keys', async () => {
        const output = await run({ roles: [{ attributes: { name: 'foo', id: '5e94bb43-cb1c-4324-a3fa-9a3f34595d5c' } }] });

        expect(output.roles![0].attributes).not.toHaveProperty('id');
    });

    it('should accept a user without an email', async () => {
        const output = await run({
            realms: [
                {
                    attributes: { name: 'foo' },
                    relations: { users: [{ attributes: { name: 'foo' } }] },
                },
            ],
        });

        expect(output.realms![0].relations!.users![0].attributes.name).toEqual('foo');
    });

    it('should reject a user with an invalid email and lowercase a valid one', async () => {
        await expect(run({
            realms: [
                {
                    attributes: { name: 'foo' },
                    relations: { users: [{ attributes: { name: 'foo', email: 'not-an-email' } }] },
                },
            ],
        })).rejects.toThrow();

        const output = await run({
            realms: [
                {
                    attributes: { name: 'foo' },
                    relations: { users: [{ attributes: { name: 'foo', email: 'Foo@Example.com' } }] },
                },
            ],
        });

        expect(output.realms![0].relations!.users![0].attributes.email).toEqual('foo@example.com');
    });

    it('should preserve permission policy relations', async () => {
        const output = await run({
            permissions: [
                {
                    attributes: { name: 'foo' },
                    relations: { policies: ['system.default'] },
                },
            ],
        });

        expect(output.permissions![0].relations!.policies).toEqual(['system.default']);
    });

    it('should preserve role realm-scope relations', async () => {
        const output = await run({
            roles: [
                {
                    attributes: { name: 'realm_admin' },
                    relations: {
                        globalPermissions: ['*'],
                        globalPermissionsExclude: ['realm_create'],
                        globalPermissionsRealmScope: RealmScope.OWN,
                        globalPermissionsRealmScopeOverrides: { [RealmScope.OWN_OR_NULL]: ['realm_read'] },
                    },
                },
            ],
        });

        const { relations } = output.roles![0];
        expect(relations!.globalPermissionsExclude).toEqual(['realm_create']);
        expect(relations!.globalPermissionsRealmScope).toEqual(RealmScope.OWN);
        expect(relations!.globalPermissionsRealmScopeOverrides).toEqual({ [RealmScope.OWN_OR_NULL]: ['realm_read'] });
    });

    it('should validate and preserve top-level policies including children', async () => {
        const output = await run({
            policies: [
                {
                    attributes: {
                        name: 'my-policy',
                        type: BuiltInPolicyType.COMPOSITE,
                        builtIn: true,
                    },
                    extraAttributes: { decisionStrategy: 'unanimous' },
                    children: [
                        {
                            attributes: {
                                name: 'my-child',
                                type: BuiltInPolicyType.ATTRIBUTE_NAMES,
                                invert: true,
                            },
                            extraAttributes: { names: ['active'] },
                        },
                    ],
                },
            ],
        });

        const [policy] = output.policies!;
        expect(policy.attributes.name).toEqual('my-policy');
        expect(policy.attributes.builtIn).toBe(true);
        expect(policy.extraAttributes).toEqual({ decisionStrategy: 'unanimous' });
        expect(policy.children![0].attributes.name).toEqual('my-child');
        expect(policy.children![0].extraAttributes).toEqual({ names: ['active'] });
    });

    it('should reject an invalid policy child', async () => {
        await expect(run({
            policies: [
                {
                    attributes: { name: 'my-policy', type: BuiltInPolicyType.COMPOSITE },
                    children: [
                        { attributes: { name: 'my-child' } },
                    ],
                },
            ],
        })).rejects.toThrow();
    });

    it('should reject a childless composite policy', async () => {
        await expect(run({
            policies: [
                { attributes: { name: 'empty-composite', type: BuiltInPolicyType.COMPOSITE } },
            ],
        })).rejects.toThrow();
    });

    it('should reject a composite policy with an empty children array', async () => {
        await expect(run({
            policies: [
                {
                    attributes: { name: 'empty-composite', type: BuiltInPolicyType.COMPOSITE },
                    children: [],
                },
            ],
        })).rejects.toThrow();
    });

    it('should reject an invalid strategy', async () => {
        await expect(run({
            roles: [
                {
                    strategy: { type: 'not-a-strategy' },
                    attributes: { name: 'foo' },
                },
            ],
        })).rejects.toThrow();
    });

    it('should accept a merge strategy with attributes', async () => {
        const output = await run({
            roles: [
                {
                    strategy: { type: 'merge', attributes: ['builtIn'] },
                    attributes: { name: 'foo', builtIn: true },
                },
            ],
        });

        expect(output.roles![0].strategy).toEqual({ type: 'merge', attributes: ['builtIn'] });
    });
});
