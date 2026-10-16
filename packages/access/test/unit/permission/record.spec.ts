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
    assertRecordReach,
    buildRecordPolicyData,
    createAuthorizationEvaluator,
    hasUnboundedReach,
    isPermissionError,
    reachesRecord,
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
    it('carries the realm as realmMatch, undefined as null', () => {
        expect(buildRecordPolicyData({ realmId: realmA }).get(BuiltInPolicyType.REALM_MATCH)).toEqual(realmA);
        expect(buildRecordPolicyData({ realmId: undefined }).get(BuiltInPolicyType.REALM_MATCH)).toBeNull();
    });

    it.each([
        ['none', [false, false, false]],
        ['own', [true, false, false]],
        ['ownOrNull', [true, false, true]],
        ['any', [true, true, true]],
    ] as const)('applies realm_scope %s to own, foreign and global records', async (scope, expected) => {
        const evaluator = await build([{ name: 'event_read', realm_scope: scope }]);
        const results = await Promise.all([realmA, realmB, null]
            .map((realmId) => reachesRecord(evaluator, 'event_read', { realmId })));
        expect(results).toEqual(expected);
    });

    it('treats a missing realm as global, never as a neutral pass', async () => {
        const evaluator = await build([{ name: 'event_read', realm_scope: 'own' }]);
        expect(await reachesRecord(evaluator, 'event_read', { realmId: undefined })).toBe(false);
    });

    it('applies attribute policies on the grant', async () => {
        const evaluator = await build([{
            name: 'event_read', 
            realm_scope: 'any', 
            policies: ['visible'], 
        }]);
        expect(await reachesRecord(evaluator, 'event_read', { realmId: realmB, attributes: { visible: true } })).toBe(true);
        expect(await reachesRecord(evaluator, 'event_read', { realmId: realmB, attributes: { visible: false } })).toBe(false);
    });

    it('evaluates an array as any-of', async () => {
        const evaluator = await build([
            { name: 'event_read', realm_scope: 'own' },
            { name: 'event_delete', realm_scope: 'any' },
        ]);
        await expect(assertRecordReach(evaluator, ['event_read', 'event_delete'], { realmId: realmB })).resolves.toBeUndefined();
        await expect(assertRecordReach(evaluator, 'event_read', { realmId: realmB })).rejects.toSatisfy(isPermissionError);
    });

    it('reports unbounded reach only for an unrestricted any grant', async () => {
        expect(await hasUnboundedReach(await build([{ name: 'event_read', realm_scope: 'any' }]), 'event_read')).toBe(true);
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
    });

    it('propagates anything that is not a permission error', async () => {
        const failing = {
            compile: async () => { throw new Error('catalog down'); },
            evaluate: async () => { throw new Error('catalog down'); },
        } as unknown as IPermissionEvaluator;
        await expect(reachesRecord(failing, 'event_read', { realmId: realmA })).rejects.toThrow('catalog down');
        await expect(hasUnboundedReach(failing, 'event_read')).rejects.toThrow('catalog down');
    });
});
