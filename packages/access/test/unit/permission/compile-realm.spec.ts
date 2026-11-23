/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { ICondition, IFilter, IFilters } from '@rapiq/core';
import { compileFilters } from '@rapiq/adapter-memory';
import type { IdentityPolicyData } from '../../../src/index.ts';
import {
    BuiltInPolicyType,
    PolicyData,
    createAuthorizationEvaluator,
    reachesRecord,
} from '../../../src/index.ts';

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
            permissions: ['post_read', 'post_update'].map((name) => ({
                name,
                realmId: null,
                clientId: null,
                decisionStrategy: null,
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

const predicate = (condition: ICondition) => compileFilters(condition as IFilter | IFilters, { caseSensitive: true });

describe('src/permission/evaluator (compile, fixed resource realm)', () => {
    it('keeps lowering the reach onto the realm column without a realm', async () => {
        const evaluator = await build([{ name: 'post_read', realm_scope: 'own' }]);
        const result = await evaluator.compile({ name: 'post_read' });

        expect(result.verdict).toEqual('conditional');

        if (result.verdict !== 'conditional') {
            return;
        }

        expect(predicate(result.condition)({ realmId: realmA })).toBe(true);
        expect(predicate(result.condition)({ realmId: realmB })).toBe(false);
    });

    it.each([
        ['own', realmA, 'allow'],
        ['own', 'master', 'allow'],
        ['own', realmB, 'deny'],
        ['own', null, 'deny'],
        ['ownOrNull', null, 'allow'],
        ['any', realmB, 'allow'],
        ['none', realmA, 'deny'],
    ] as const)('settles a %s grant for the realm %s to %s', async (scope, realm, verdict) => {
        const evaluator = await build([{ name: 'post_read', realm_scope: scope }]);

        expect((await evaluator.compile({ name: 'post_read', realm })).verdict).toEqual(verdict);
    });

    it.each(['none', 'own', 'ownOrNull', 'any'] as const)(
        'emits no realm term for a realm-less resource (%s)',
        async (scope) => {
            const evaluator = await build([{ name: 'post_read', realm_scope: scope }]);

            expect((await evaluator.compile({ name: 'post_read', realm: false })).verdict).toEqual('allow');
        },
    );

    it.each([realmA, false] as const)('lowers only the remaining policy terms (realm %s)', async (realm) => {
        const evaluator = await build([{
            name: 'post_read', 
            realm_scope: 'own', 
            policies: ['visible'], 
        }]);
        const result = await evaluator.compile({ name: 'post_read', realm });

        expect(result.verdict).toEqual('conditional');

        if (result.verdict !== 'conditional') {
            return;
        }

        const test = predicate(result.condition);

        expect(test({ visible: true })).toBe(true);
        expect(test({ visible: false })).toBe(false);

        for (const visible of [true, false]) {
            expect(test({ visible })).toBe(await reachesRecord(evaluator, {
                name: 'post_read',
                realm,
                data: { [BuiltInPolicyType.ATTRIBUTES]: { visible } },
            }));
        }
    });

    it('denies a policy-bound grant out of reach of the fixed realm', async () => {
        const evaluator = await build([{
            name: 'post_read', 
            realm_scope: 'own', 
            policies: ['visible'], 
        }]);

        expect((await evaluator.compile({ name: 'post_read', realm: realmB })).verdict).toEqual('deny');
    });

    it('denies without a grant', async () => {
        const evaluator = await build([{ name: 'post_update', realm_scope: 'any' }]);

        expect((await evaluator.compile({ name: 'post_read', realm: false })).verdict).toEqual('deny');
        expect((await evaluator.compile({ name: 'post_read', realm: realmA })).verdict).toEqual('deny');
    });

    it('refuses a realm next to data carrying realmMatch', async () => {
        const evaluator = await build([{ name: 'post_read', realm_scope: 'any' }]);

        await expect(evaluator.compile({
            name: 'post_read',
            realm: realmA,
            data: new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: realmB }),
        })).rejects.toThrow();
    });

    it('refuses a malformed realm', async () => {
        const evaluator = await build([{ name: 'post_read', realm_scope: 'any' }]);

        await expect(evaluator.compile({
            name: 'post_read',
            realm: undefined as unknown as string,
        })).resolves.toEqual({ verdict: 'allow' });
        await expect(evaluator.compile({
            name: 'post_read',
            realm: 42 as unknown as string,
        })).rejects.toThrow();
    });
});
