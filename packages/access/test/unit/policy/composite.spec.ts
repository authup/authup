/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { DecisionStrategy } from '@authup/kit';
import type { BasePolicy } from '../../../src';
import {
    BuiltInPolicyType,
    PolicyEngine,
    definePolicyData,
    definePolicyEvaluationContext,
    definePolicyWithType,
} from '../../../src';
import { PolicyDefaultEvaluators } from '../../../src/policy/constants.ts';

const engine = new PolicyEngine(PolicyDefaultEvaluators);

// settles true: the identity data below is of type `user`.
const truthy = definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] });

// settles false: the identity data below is not of type `client`.
const falsy = definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['client'] });

// stays pending: no ATTRIBUTES key in the data bag.
const pending = definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: { $eq: 'admin' } } });

const context = () => definePolicyEvaluationContext({
    data: definePolicyData({
        [BuiltInPolicyType.IDENTITY]: {
            type: 'user',
            id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
            realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
        },
    }),
});

function composite(
    decisionStrategy: `${DecisionStrategy}`,
    children: BasePolicy[],
    invert?: boolean,
) {
    return definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
        decisionStrategy,
        children,
        ...(invert ? { invert } : {}),
    });
}

describe('src/policy/composite (tri-state algebra)', () => {
    describe(DecisionStrategy.AFFIRMATIVE, () => {
        it('should settle true on a settled-true child despite pendings', async () => {
            const outcome = await engine.evaluate(
                composite(DecisionStrategy.AFFIRMATIVE, [pending, truthy]),
                context(),
            );
            expect(outcome.success).toBeTruthy();
            expect(outcome.pending).toBeFalsy();
        });

        it('should stay pending when no child settled true and one is pending', async () => {
            const outcome = await engine.evaluate(
                composite(DecisionStrategy.AFFIRMATIVE, [pending, falsy]),
                context(),
            );
            expect(outcome.success).toBeFalsy();
            expect(outcome.pending).toBeTruthy();
        });

        it('should settle false when every child settled false', async () => {
            const outcome = await engine.evaluate(
                composite(DecisionStrategy.AFFIRMATIVE, [falsy, falsy]),
                context(),
            );
            expect(outcome.success).toBeFalsy();
            expect(outcome.pending).toBeFalsy();
        });
    });

    describe(DecisionStrategy.UNANIMOUS, () => {
        it('should settle false on a settled-false child despite pendings', async () => {
            const outcome = await engine.evaluate(
                composite(DecisionStrategy.UNANIMOUS, [pending, falsy]),
                context(),
            );
            expect(outcome.success).toBeFalsy();
            expect(outcome.pending).toBeFalsy();
        });

        it('should stay pending when every settled child succeeded and one is pending', async () => {
            const outcome = await engine.evaluate(
                composite(DecisionStrategy.UNANIMOUS, [pending, truthy]),
                context(),
            );
            expect(outcome.success).toBeFalsy();
            expect(outcome.pending).toBeTruthy();
        });

        it('should settle true when every child settled true', async () => {
            const outcome = await engine.evaluate(
                composite(DecisionStrategy.UNANIMOUS, [truthy, truthy]),
                context(),
            );
            expect(outcome.success).toBeTruthy();
            expect(outcome.pending).toBeFalsy();
        });
    });

    describe(DecisionStrategy.CONSENSUS, () => {
        it('should settle true when pendings cannot flip the balance', async () => {
            const outcome = await engine.evaluate(
                composite(DecisionStrategy.CONSENSUS, [truthy, truthy, pending]),
                context(),
            );
            expect(outcome.success).toBeTruthy();
            expect(outcome.pending).toBeFalsy();
        });

        it('should settle false when pendings cannot flip the balance', async () => {
            const outcome = await engine.evaluate(
                composite(DecisionStrategy.CONSENSUS, [falsy, falsy, pending]),
                context(),
            );
            expect(outcome.success).toBeFalsy();
            expect(outcome.pending).toBeFalsy();
        });

        it('should stay pending when the balance straddles zero', async () => {
            const outcome = await engine.evaluate(
                composite(DecisionStrategy.CONSENSUS, [truthy, falsy, pending]),
                context(),
            );
            expect(outcome.success).toBeFalsy();
            expect(outcome.pending).toBeTruthy();
        });
    });

    describe('invert', () => {
        it('should never apply invert to a pending composite', async () => {
            const outcome = await engine.evaluate(
                composite(DecisionStrategy.AFFIRMATIVE, [pending], true),
                context(),
            );
            expect(outcome.success).toBeFalsy();
            expect(outcome.pending).toBeTruthy();
        });

        it('should apply invert to a settled composite', async () => {
            const outcome = await engine.evaluate(
                composite(DecisionStrategy.UNANIMOUS, [truthy], true),
                context(),
            );
            expect(outcome.success).toBeFalsy();
            expect(outcome.pending).toBeFalsy();
        });
    });
});
