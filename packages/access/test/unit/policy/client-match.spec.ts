/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { eq, inArray, not } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import type { ClientMatchPolicy, PolicyEvaluationContextInput } from '../../../src/index.ts';
import {
    BuiltInPolicyType,
    ClientMatchPolicyEvaluator,
    ClientMatchPolicyValidator,
    PolicyData,
    PolicyDefaultEvaluators,
    PolicyDefaultValidators,
    SystemPolicyName,
    definePolicyEvaluationContext,
} from '../../../src/index.ts';

describe('src/policy/client-match', () => {
    const C1 = '6f1d1c1e-6a4b-4d3c-9c1a-1b2c3d4e5f60';
    const C2 = '0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d';
    const U1 = '245e3c5d-5747-4fbd-8554-c33d34780c58';
    const evaluator = new ClientMatchPolicyEvaluator();
    const clientIdentity = {
        type: 'client', 
        id: C1, 
        clientId: C1, 
    };
    const userIdentity = {
        type: 'user', 
        id: U1, 
        clientId: null, 
    };

    const run = (
        policy: ClientMatchPolicy,
        data: Record<string, any>,
        ctx: PolicyEvaluationContextInput = {},
    ) => evaluator.evaluate(
        policy,
        definePolicyEvaluationContext({ ...ctx, data: new PolicyData(data) }),
    );

    it('exposes the type and system policy name', () => {
        expect(BuiltInPolicyType.CLIENT_MATCH).toEqual('clientMatch');
        expect(SystemPolicyName.CLIENT_OWNED).toEqual('system.client-owned');
        expect(PolicyDefaultEvaluators[BuiltInPolicyType.CLIENT_MATCH]).toBeInstanceOf(ClientMatchPolicyEvaluator);
        expect(PolicyDefaultValidators[BuiltInPolicyType.CLIENT_MATCH]).toBeInstanceOf(ClientMatchPolicyValidator);
    });

    it('passes for the owning client', async () => {
        const outcome = await run({}, {
            [BuiltInPolicyType.IDENTITY]: clientIdentity,
            [BuiltInPolicyType.CLIENT_MATCH]: C1,
        });

        expect(outcome.success).toBe(true);
    });

    it('fails for another owner', async () => {
        const outcome = await run({}, {
            [BuiltInPolicyType.IDENTITY]: clientIdentity,
            [BuiltInPolicyType.CLIENT_MATCH]: C2,
        });

        expect(outcome.success).toBe(false);
    });

    it('fails for a definition owned by no client', async () => {
        const outcome = await run({}, {
            [BuiltInPolicyType.IDENTITY]: clientIdentity,
            [BuiltInPolicyType.CLIENT_MATCH]: null,
        });

        expect(outcome.success).toBe(false);
    });

    it('fails for an actor without a client', async () => {
        const outcome = await run({}, {
            [BuiltInPolicyType.IDENTITY]: userIdentity,
            [BuiltInPolicyType.CLIENT_MATCH]: C1,
        });

        expect(outcome.success).toBe(false);
    });

    it('fails for a user identity carrying the owner as its client', async () => {
        const identity = { ...userIdentity, clientId: C1 };
        const outcome = await run({}, {
            [BuiltInPolicyType.IDENTITY]: identity,
            [BuiltInPolicyType.CLIENT_MATCH]: C1,
        });

        expect(outcome.success).toBe(false);

        const lowered = await run({}, { [BuiltInPolicyType.IDENTITY]: identity }, {
            withConditions: true,
            clientAttributeName: 'clientId',
        });

        expect(lowered.condition).toEqual(inArray('clientId', []));
    });

    it('applies invert to a present owner', async () => {
        const foreign = await run({ invert: true }, {
            [BuiltInPolicyType.IDENTITY]: clientIdentity,
            [BuiltInPolicyType.CLIENT_MATCH]: C2,
        });

        expect(foreign.success).toBe(true);

        const own = await run({ invert: true }, {
            [BuiltInPolicyType.IDENTITY]: clientIdentity,
            [BuiltInPolicyType.CLIENT_MATCH]: C1,
        });

        expect(own.success).toBe(false);
    });

    it('fails closed when no owner is supplied, without invert', async () => {
        const outcome = await run({}, { [BuiltInPolicyType.IDENTITY]: clientIdentity });

        expect(outcome.success).toBe(false);
        expect(outcome.pending).toBeFalsy();
        expect(outcome.unevaluable).toBe(true);

        const inverted = await run({ invert: true }, { [BuiltInPolicyType.IDENTITY]: clientIdentity });

        expect(inverted.success).toBe(false);
        expect(inverted.pending).toBeFalsy();
    });

    it('pends ahead of the resource', async () => {
        const outcome = await run({}, { [BuiltInPolicyType.IDENTITY]: clientIdentity }, { preliminary: true });

        expect(outcome.success).toBe(false);
        expect(outcome.pending).toBe(true);
    });

    it('pends without a condition while lowering with no owner column', async () => {
        const outcome = await run({}, { [BuiltInPolicyType.IDENTITY]: clientIdentity }, { withConditions: true });

        expect(outcome.pending).toBe(true);
        expect(outcome.condition).toBeUndefined();
    });

    it('pends with a condition over the named owner column', async () => {
        const outcome = await run({}, { [BuiltInPolicyType.IDENTITY]: clientIdentity }, {
            withConditions: true,
            clientAttributeName: 'clientId',
        });

        expect(outcome.pending).toBe(true);
        expect(outcome.condition).toEqual(eq('clientId', C1));
        expect(outcome.failCondition).toEqual(not(eq('clientId', C1)));

        const user = await run({}, { [BuiltInPolicyType.IDENTITY]: userIdentity }, {
            withConditions: true,
            clientAttributeName: 'clientId',
        });

        expect(user.pending).toBe(true);
        expect(user.condition).toEqual(inArray('clientId', []));
    });

    it('negates the condition under invert', async () => {
        const condition = await evaluator.toCondition({ invert: true }, definePolicyEvaluationContext({
            data: new PolicyData({ [BuiltInPolicyType.IDENTITY]: clientIdentity }),
            clientAttributeName: 'clientId',
        }));

        expect(condition).toEqual(not(eq('clientId', C1)));
    });

    it('is unevaluable without an identity', async () => {
        const outcome = await run({}, { [BuiltInPolicyType.CLIENT_MATCH]: C1 });

        expect(outcome.success).toBe(false);
        expect(outcome.unevaluable).toBe(true);
    });

    it('requires only the identity', () => {
        expect(evaluator.requires()).toEqual([BuiltInPolicyType.IDENTITY]);
    });

    it('validates invert and strips other keys', async () => {
        const validator = new ClientMatchPolicyValidator();
        const input : Record<string, any> = { invert: true, foo: 'bar' };
        const output = await validator.run(input);

        expect(output.invert).toBe(true);
        expect(output).not.toHaveProperty('foo');
    });
});
