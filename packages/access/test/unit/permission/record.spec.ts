/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { IPermissionEvaluator, IdentityPolicyData } from '../../../src';
import {
    BuiltInPolicyType,
    PermissionEvaluator,
    PermissionMemoryProvider,
    PolicyData,
    PolicyDefaultEvaluators,
    PolicyEngine,
    createAuthorizationEvaluator,
    definePolicyWithType,
    evaluateRecord,
    evaluateRecordOneOf,
    evaluateRecordUpdate,
    hasUnboundedReach,
    isPermissionError,
    reachesRecord,
    reachesRecordOneOf,
} from '../../../src';

const realmA = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';
const realmB = 'c641912c-21e5-4cb4-84b6-169e2b2bb024';

const identity : IdentityPolicyData = {
    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
    type: 'user',
    realmId: realmA,
    realmName: 'master',
    clientId: null,
};

function build(grants: {
    name: string,
    realm_scope: string,
    policies?: string[]
}[]) {
    return createAuthorizationEvaluator({
        catalog: {
            policies: {
                binding: { type: 'permissionBinding' },
                visible: { type: 'attributes', query: { visible: { $eq: true } } },
            },
            permissions: ['event_read', 'event_delete'].map((name) => ({
                name,
                realm_id: null,
                client_id: null,
                decision_strategy: null,
                policies: ['binding'],
            })),
        },
        grants: grants.map((grant) => ({
            realm_id: null,
            client_id: null,
            policies: [],
            ...grant,
        })),
        identity,
    });
}

describe('src/permission/record', () => {
    it.each([
        ['none', [false, false, false]],
        ['own', [true, false, false]],
        ['ownOrNull', [true, false, true]],
        ['any', [true, true, true]],
    ] as const)('applies realm_scope %s to own, foreign and global records', async (scope, expected) => {
        const evaluator = await build([{ name: 'event_read', realm_scope: scope }]);
        const results = await Promise.all([realmA, realmB, null]
            .map((realm) => reachesRecord(evaluator, { name: 'event_read', realm })));
        expect(results).toEqual(expected);
    });

    it('requires every realm of a multi-realm record', async () => {
        const ownOrNull = await build([{ name: 'event_read', realm_scope: 'ownOrNull' }]);
        expect(await reachesRecord(ownOrNull, { name: 'event_read', realm: [realmA, null] })).toBe(true);
        expect(await reachesRecord(ownOrNull, { name: 'event_read', realm: [realmA, realmB] })).toBe(false);
    });

    it('throws when the realm is undefined, never a neutral pass', async () => {
        const evaluator = await build([{ name: 'event_read', realm_scope: 'any' }]);
        await expect(reachesRecord(evaluator, {
            name: 'event_read',
            realm: undefined as unknown as null,
        })).rejects.toThrow('event_read');
    });

    it('throws when the data already carries realmMatch', async () => {
        const evaluator = await build([{ name: 'event_read', realm_scope: 'any' }]);
        await expect(evaluateRecord(evaluator, {
            name: 'event_read',
            realm: realmA,
            data: { [BuiltInPolicyType.REALM_MATCH]: realmB },
        })).rejects.toThrow('event_read');
        await expect(evaluateRecord(evaluator, {
            name: 'event_read',
            realm: realmA,
            data: new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: undefined }),
        })).rejects.toThrow('event_read');
    });

    it('never mutates the caller data', async () => {
        const evaluator = await build([{ name: 'event_read', realm_scope: 'own' }]);
        const data = new PolicyData({ custom: true });
        expect(await reachesRecord(evaluator, {
            name: 'event_read', 
            realm: realmA, 
            data, 
        })).toBe(true);
        expect(await reachesRecord(evaluator, {
            name: 'event_read', 
            realm: realmB, 
            data, 
        })).toBe(false);
        expect(data.has(BuiltInPolicyType.REALM_MATCH)).toBe(false);
        expect(data.has(BuiltInPolicyType.ATTRIBUTES)).toBe(false);

        const input = { custom: true };
        expect(await reachesRecord(evaluator, {
            name: 'event_read',
            realm: realmA,
            data: input,
        })).toBe(true);
        expect(input).toEqual({ custom: true });
    });

    it('applies attribute policies on the grant', async () => {
        const evaluator = await build([{
            name: 'event_read',
            realm_scope: 'any',
            policies: ['visible'],
        }]);
        expect(await reachesRecord(evaluator, {
            name: 'event_read',
            realm: realmB,
            data: { [BuiltInPolicyType.ATTRIBUTES]: { visible: true } },
        })).toBe(true);
        expect(await reachesRecord(evaluator, {
            name: 'event_read',
            realm: realmB,
            data: { [BuiltInPolicyType.ATTRIBUTES]: { visible: false } },
        })).toBe(false);
    });

    it('leaves an attribute policy pending without attributes, never synthesizing a row', async () => {
        // The catalog evaluator refuses evaluation options, so this runs on a bare one.
        const evaluator = new PermissionEvaluator({
            provider: new PermissionMemoryProvider([{
                permission: { name: 'event_read' },
                policies: [definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { visible: { $ne: true } } })],
            }]),
            policyEngine: new PolicyEngine(PolicyDefaultEvaluators),
        });
        expect(await reachesRecord(evaluator, { name: 'event_read', realm: realmB })).toBe(false);
        expect(await reachesRecord(evaluator, {
            name: 'event_read',
            realm: realmB,
            data: { [BuiltInPolicyType.ATTRIBUTES]: { visible: false } },
        })).toBe(true);
        expect(await reachesRecord(evaluator, {
            name: 'event_read',
            realm: realmB,
            options: { pendingPolicies: 'permit' },
        })).toBe(true);
    });

    it('evaluates an array as all-of, and as any-of in the OneOf form', async () => {
        const evaluator = await build([
            { name: 'event_read', realm_scope: 'own' },
            { name: 'event_delete', realm_scope: 'any' },
        ]);
        const names = ['event_read', 'event_delete'];
        await expect(evaluateRecordOneOf(evaluator, { name: names, realm: realmB })).resolves.toBeUndefined();
        await expect(evaluateRecord(evaluator, { name: names, realm: realmB })).rejects.toSatisfy(isPermissionError);
        expect(await reachesRecordOneOf(evaluator, { name: names, realm: realmB })).toBe(true);
        expect(await reachesRecord(evaluator, { name: names, realm: realmB })).toBe(false);
        expect(await reachesRecord(evaluator, { name: names, realm: realmA })).toBe(true);
    });

    it('refuses an update moving a record into or out of reach', async () => {
        const evaluator = await build([{ name: 'event_read', realm_scope: 'own' }]);
        await expect(evaluateRecordUpdate(evaluator, {
            name: 'event_read',
            current: { realm: realmA },
            next: { realm: realmA },
        })).resolves.toBeUndefined();
        await expect(evaluateRecordUpdate(evaluator, {
            name: 'event_read',
            current: { realm: realmB },
            next: { realm: realmA },
        })).rejects.toSatisfy(isPermissionError);
        await expect(evaluateRecordUpdate(evaluator, {
            name: 'event_read',
            current: { realm: realmA },
            next: { realm: realmB },
        })).rejects.toSatisfy(isPermissionError);
    });

    it('refuses an update whose attributes move a record into or out of reach', async () => {
        const evaluator = await build([{
            name: 'event_read',
            realm_scope: 'any',
            policies: ['visible'],
        }]);
        await expect(evaluateRecordUpdate(evaluator, {
            name: 'event_read',
            current: { realm: realmB, data: { [BuiltInPolicyType.ATTRIBUTES]: { visible: true } } },
            next: { realm: realmB, data: { [BuiltInPolicyType.ATTRIBUTES]: { visible: true } } },
        })).resolves.toBeUndefined();
        await expect(evaluateRecordUpdate(evaluator, {
            name: 'event_read',
            current: { realm: realmB, data: { [BuiltInPolicyType.ATTRIBUTES]: { visible: false } } },
            next: { realm: realmB, data: { [BuiltInPolicyType.ATTRIBUTES]: { visible: true } } },
        })).rejects.toSatisfy(isPermissionError);
        await expect(evaluateRecordUpdate(evaluator, {
            name: 'event_read',
            current: { realm: realmB, data: { [BuiltInPolicyType.ATTRIBUTES]: { visible: true } } },
            next: { realm: realmB, data: { [BuiltInPolicyType.ATTRIBUTES]: { visible: false } } },
        })).rejects.toSatisfy(isPermissionError);
    });

    it('never lets an update target override the permission name', async () => {
        const evaluator = await build([
            { name: 'event_read', realm_scope: 'own' },
            { name: 'event_delete', realm_scope: 'any' },
        ]);
        const row = { realm: realmB, name: 'event_delete' };
        await expect(evaluateRecordUpdate(evaluator, {
            name: 'event_read',
            current: row,
            next: row,
        })).rejects.toSatisfy(isPermissionError);
    });

    it('throws for policy data that is not a PolicyData instance of this package', async () => {
        const evaluator = await build([{ name: 'event_read', realm_scope: 'any' }]);
        const foreign = {
            has: () => false,
            get: () => undefined,
            clone: () => foreign,
        };
        await expect(evaluateRecord(evaluator, {
            name: 'event_read',
            realm: realmA,
            data: foreign,
        })).rejects.toThrow('event_read');
    });

    it('reports unbounded reach only for an unrestricted any grant', async () => {
        expect(await hasUnboundedReach(await build([{ name: 'event_read', realm_scope: 'any' }]), 'event_read')).toBe(true);
        expect(await hasUnboundedReach(await build([{ name: 'event_read', realm_scope: 'ownOrNull' }]), 'event_read')).toBe(false);
        expect(await hasUnboundedReach(await build([{ name: 'event_read', realm_scope: 'own' }]), 'event_read')).toBe(false);
        expect(await hasUnboundedReach(
            await build([{
                name: 'event_read',
                realm_scope: 'any',
                policies: ['visible'],
            }]),
            'event_read',
        )).toBe(false);
        expect(await hasUnboundedReach(await build([]), 'event_read')).toBe(false);
        expect(await hasUnboundedReach(
            await build([{ name: 'event_delete', realm_scope: 'any' }]),
            ['event_read', 'event_delete'],
        )).toBe(true);
    });

    it('propagates anything that is not a permission error', async () => {
        const failing = {
            compile: async () => { throw new Error('catalog down'); },
            evaluate: async () => { throw new Error('catalog down'); },
            evaluateOneOf: async () => { throw new Error('catalog down'); },
        } as unknown as IPermissionEvaluator;
        await expect(reachesRecord(failing, { name: 'event_read', realm: realmA })).rejects.toThrow('catalog down');
        await expect(reachesRecordOneOf(failing, { name: 'event_read', realm: realmA })).rejects.toThrow('catalog down');
        await expect(hasUnboundedReach(failing, 'event_read')).rejects.toThrow('catalog down');
    });
});
