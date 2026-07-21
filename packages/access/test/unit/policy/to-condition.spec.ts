/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { ICondition, IFilter, IFilters } from '@rapiq/core';
import { compileFilters } from '@rapiq/memory';
import { DecisionStrategy } from '@authup/kit';
import type { PolicyEvaluationContextInput, PolicyEvaluationResult, RealmScope } from '../../../src';
import {
    BuiltInPolicyType,
    PolicyEngine,
    definePolicyData,
    definePolicyEvaluationContext,
    definePolicyWithType,
} from '../../../src';
import { PolicyDefaultEvaluators } from '../../../src/policy/constants.ts';

const engine = new PolicyEngine(PolicyDefaultEvaluators);

const identityData = {
    type: 'user',
    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
    realmName: 'master',
};

const attributesPolicy = (invert?: boolean) => definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, {
    query: { name: { $eq: 'admin' } },
    ...(invert ? { invert } : {}),
});

const identityPolicy = definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] });

const context = (input?: PolicyEvaluationContextInput) => definePolicyEvaluationContext({
    withConditions: true,
    ...(input || {}),
});

const withIdentity = () => definePolicyData({ [BuiltInPolicyType.IDENTITY]: identityData });

// compileFilters is typed over the concrete IFilter | IFilters union rather than
// the ICondition interface both implement — narrowing cast at the boundary.
const test = (condition: ICondition) => compileFilters(condition as IFilter | IFilters, { caseSensitive: true });

async function evaluateOnRow(policy: Record<string, any>, row: Record<string, any>) : Promise<boolean> {
    const outcome = await engine.evaluate(policy, definePolicyEvaluationContext({
        data: definePolicyData({
            [BuiltInPolicyType.IDENTITY]: identityData,
            [BuiltInPolicyType.ATTRIBUTES]: row,
        }),
    }));

    return outcome.success;
}

async function expectParity(policy: Record<string, any>, outcome: PolicyEvaluationResult, rows: Record<string, any>[]) {
    expect(outcome.pending).toBeTruthy();
    expect(outcome.condition).toBeDefined();

    const predicate = test(outcome.condition!);
    for (const row of rows) {
        expect(predicate(row), JSON.stringify(row)).toEqual(await evaluateOnRow(policy, row));
    }
}

describe('src/policy (toCondition / WHERE pushdown)', () => {
    it('should attach the condition form to a pending attributes leaf', async () => {
        const policy = attributesPolicy();

        const outcome = await engine.evaluate(policy, context());
        await expectParity(policy, outcome, [{ name: 'admin' }, { name: 'guest' }]);
    });

    it('should lower an inverted attributes leaf via not()', async () => {
        const policy = attributesPolicy(true);

        const outcome = await engine.evaluate(policy, context());
        await expectParity(policy, outcome, [{ name: 'admin' }, { name: 'guest' }]);
    });

    it('should not attach a condition without withConditions', async () => {
        const outcome = await engine.evaluate(attributesPolicy(), definePolicyEvaluationContext());
        expect(outcome.pending).toBeTruthy();
        expect(outcome.condition).toBeUndefined();
    });

    it('should drop settled children from the residual (AND)', async () => {
        const policy = definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
            decisionStrategy: DecisionStrategy.UNANIMOUS,
            children: [attributesPolicy(), identityPolicy],
        });

        const outcome = await engine.evaluate(policy, context({ data: withIdentity() }));
        await expectParity(policy, outcome, [{ name: 'admin' }, { name: 'guest' }]);
    });

    it('should compose an OR residual when every branch lowers', async () => {
        const other = definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: { $eq: 'guest' } } });
        const policy = definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
            decisionStrategy: DecisionStrategy.AFFIRMATIVE,
            children: [attributesPolicy(), other],
        });

        const outcome = await engine.evaluate(policy, context({ data: withIdentity() }));
        await expectParity(policy, outcome, [
            { name: 'admin' },
            { name: 'guest' },
            { name: 'other' },
        ]);
    });

    it('should not lower an OR with a non-lowerable pending branch', async () => {
        const policy = definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
            decisionStrategy: DecisionStrategy.AFFIRMATIVE,
            children: [attributesPolicy(), identityPolicy],
        });

        // no identity data: the identity child pends and has no condition form
        const outcome = await engine.evaluate(policy, context());
        expect(outcome.pending).toBeTruthy();
        expect(outcome.condition).toBeUndefined();
    });

    it('should not partially lower an AND (exact-only)', async () => {
        const policy = definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
            decisionStrategy: DecisionStrategy.UNANIMOUS,
            children: [attributesPolicy(), identityPolicy],
        });

        const outcome = await engine.evaluate(policy, context());
        expect(outcome.pending).toBeTruthy();
        expect(outcome.condition).toBeUndefined();
    });

    it('should wrap an inverted composite residual symbolically', async () => {
        // NOT(attributes AND identity) with identity settled true => residual NOT(attributes)
        const policy = definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
            invert: true,
            decisionStrategy: DecisionStrategy.UNANIMOUS,
            children: [attributesPolicy(), identityPolicy],
        });

        const outcome = await engine.evaluate(policy, context({ data: withIdentity() }));
        await expectParity(policy, outcome, [{ name: 'admin' }, { name: 'guest' }]);
    });

    it('should never lower a CONSENSUS residual', async () => {
        const policy = definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
            decisionStrategy: DecisionStrategy.CONSENSUS,
            children: [attributesPolicy()],
        });

        const outcome = await engine.evaluate(policy, context({ data: withIdentity() }));
        expect(outcome.pending).toBeTruthy();
        expect(outcome.condition).toBeUndefined();
    });

    it('should stay pending without a condition when toCondition throws', async () => {
        const localEngine = new PolicyEngine({
            broken: {
                requires: () => ['x'],
                toCondition: async () => {
                    throw new Error('boom');
                },
                evaluate: async () => ({ success: true }),
            },
        });

        const outcome = await localEngine.evaluate({ type: 'broken' }, context());
        expect(outcome.pending).toBeTruthy();
        expect(outcome.condition).toBeUndefined();
    });

    describe('realm-match scope mode', () => {
        const rows = [
            { realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023' },
            { realmId: '11111111-2222-4333-8444-555555555555' },
            { realmId: 'master' },
            { realmId: null },
        ];

        const scopePolicy = (scope: `${RealmScope}`) => definePolicyWithType(
            BuiltInPolicyType.REALM_MATCH,
            { scope },
        );

        async function expectScopeParity(scope: `${RealmScope}`, expected: boolean[]) {
            const outcome = await engine.evaluate(scopePolicy(scope), context({ data: withIdentity() }));
            expect(outcome.pending).toBeTruthy();
            expect(outcome.condition).toBeDefined();

            const predicate = test(outcome.condition!);
            for (const [i, row] of rows.entries()) {
                expect(predicate(row!), `${scope} ${JSON.stringify(row)}`).toEqual(expected[i]);

                // parity with the settled evaluation once the resource realm is known
                const settled = await engine.evaluate(scopePolicy(scope), definePolicyEvaluationContext({
                    data: definePolicyData({
                        [BuiltInPolicyType.IDENTITY]: identityData,
                        [BuiltInPolicyType.REALM_MATCH]: row!.realmId,
                    }),
                }));
                expect(settled.success, `${scope} settled ${JSON.stringify(row)}`).toEqual(expected[i]);
            }
        }

        it('should lower own reach', async () => {
            await expectScopeParity('own', [true, false, true, false]);
        });

        it('should lower ownOrNull reach', async () => {
            await expectScopeParity('ownOrNull', [true, false, true, true]);
        });

        it('should lower any reach', async () => {
            await expectScopeParity('any', [true, true, true, true]);
        });

        it('should lower none reach', async () => {
            await expectScopeParity('none', [false, false, false, false]);
        });

        it('should keep the neutral-pass without withConditions', async () => {
            const outcome = await engine.evaluate(scopePolicy('own'), definePolicyEvaluationContext({ data: withIdentity() }));
            expect(outcome.success).toBeTruthy();
            expect(outcome.pending).toBeFalsy();
        });
    });

    describe('realm-match attribute mode', () => {
        it('should lower a single explicit attribute key', async () => {
            const policy = definePolicyWithType(BuiltInPolicyType.REALM_MATCH, {
                attributeName: 'realmId',
                attributeNullMatchAll: true,
            });

            const outcome = await engine.evaluate(policy, context({ data: withIdentity() }));
            await expectParity(policy, outcome, [
                { realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023' },
                { realmId: '11111111-2222-4333-8444-555555555555' },
                { realmId: 'master' },
                { realmId: null },
            ]);
        });

        it('should lower an inverted single-key config', async () => {
            const policy = definePolicyWithType(BuiltInPolicyType.REALM_MATCH, {
                attributeName: 'realmId',
                invert: true,
            });

            const outcome = await engine.evaluate(policy, context({ data: withIdentity() }));
            await expectParity(policy, outcome, [
                { realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023' },
                { realmId: '11111111-2222-4333-8444-555555555555' },
                { realmId: null },
            ]);
        });

        it('should not lower the default multi-key config', async () => {
            const policy = definePolicyWithType(BuiltInPolicyType.REALM_MATCH, {});

            const outcome = await engine.evaluate(policy, context({ data: withIdentity() }));
            expect(outcome.pending).toBeTruthy();
            expect(outcome.condition).toBeUndefined();
        });
    });
});
