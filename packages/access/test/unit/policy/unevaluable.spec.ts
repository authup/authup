/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { compileFilters } from '@rapiq/adapter-memory';
import type { ICondition, IFilter, IFilters } from '@rapiq/core';
import { eq } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { DecisionStrategy } from '@authup/kit';
import type {
    BasePolicy,
    IPolicyEvaluator,
    PermissionPolicyBinding,
    PolicyData,
    PolicyEvaluationContext,
    PolicyEvaluationResult,
    PolicyWithType,
} from '../../../src';
import {
    BuiltInPolicyType,
    IdentityPermissionBindingPolicyEvaluator,
    PolicyDefaultEvaluators,
    PolicyEngine,
    PolicyIssueCode,
    definePolicyData,
    definePolicyEvaluationContext,
    definePolicyIssueItem,
    definePolicyWithType,
} from '../../../src';

// ---------------------------------------------------------------------
// The truth table
// ---------------------------------------------------------------------

type Leaf = 't' | 'f' | 'p' | 'u';
type Truth = 'T' | 'F' | 'U';
type Verdict = 'pass' | 'deny' | 'pending' | 'unevaluable';
type Expectation = {
    verdict: Verdict,
    // whether a pending node is expected to carry a condition under `withConditions`
    condition: boolean,
};

const ROW_KEY = 'row';

function createSettledEvaluator(success: boolean) : IPolicyEvaluator {
    return {
        async evaluate(_value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
            if (success) {
                return { success: true };
            }

            return {
                success: false,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.EVALUATION_DENIED,
                        message: 'The stub denies',
                        path: ctx.path,
                    }),
                ],
            };
        },
    };
}

// pends while the bag carries no row, and settles on the row's flag once it does
const rowEvaluator : IPolicyEvaluator = {
    requires() : string[] {
        return [ROW_KEY];
    },

    async toCondition() : Promise<ICondition | null> {
        return eq('flag', true);
    },

    async evaluate(_value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        const row = ctx.data.get<{ flag: boolean }>(ROW_KEY);

        return { success: row.flag };
    },
};

const tableEngine = new PolicyEngine({
    ...PolicyDefaultEvaluators,
    t: createSettledEvaluator(true),
    f: createSettledEvaluator(false),
    p: rowEvaluator,
});

const LEAVES : Leaf[] = ['t', 'f', 'p', 'u'];
const STRATEGIES = [
    DecisionStrategy.AFFIRMATIVE,
    DecisionStrategy.UNANIMOUS,
    DecisionStrategy.CONSENSUS,
];

function buildMixes(size: number) : Leaf[][] {
    if (size === 0) {
        return [[]];
    }

    const output : Leaf[][] = [];

    for (const rest of buildMixes(size - 1)) {
        for (const leaf of LEAVES) {
            output.push([leaf, ...rest]);
        }
    }

    return output;
}

// every ordered mix of one to three children, which covers every multiset in every order
const MIXES = [...buildMixes(1), ...buildMixes(2), ...buildMixes(3)];

// Kleene: an unevaluable child is an unknown that never resolves
function combine(strategy: DecisionStrategy, children: Truth[]) : Truth {
    if (strategy === DecisionStrategy.AFFIRMATIVE) {
        if (children.includes('T')) {
            return 'T';
        }

        return children.includes('U') ? 'U' : 'F';
    }

    if (children.includes('F')) {
        return 'F';
    }

    return children.includes('U') ? 'U' : 'T';
}

function negate(value: Truth, invert: boolean) : Truth {
    if (!invert || value === 'U') {
        return value;
    }

    return value === 'T' ? 'F' : 'T';
}

// every way the pending children could still resolve
function resolve(children: Leaf[]) : Truth[][] {
    let output : Truth[][] = [[]];

    for (const child of children) {
        let values : Truth[];

        if (child === 'p') {
            values = ['T', 'F'];
        } else if (child === 'u') {
            values = ['U'];
        } else {
            values = [child === 't' ? 'T' : 'F'];
        }

        output = output.flatMap((prefix) => values.map((value) => [...prefix, value]));
    }

    return output;
}

function expected(strategy: DecisionStrategy, invert: boolean, children: Leaf[]) : Expectation {
    const pending = children.filter((child) => child === 'p').length;
    const unevaluable = children.filter((child) => child === 'u').length;

    if (strategy === DecisionStrategy.CONSENSUS) {
        const count = children.filter((child) => child === 't').length -
            children.filter((child) => child === 'f').length;
        const unknown = pending + unevaluable;

        if (count - unknown > 0) {
            return { verdict: invert ? 'deny' : 'pass', condition: false };
        }

        if (count + unknown <= 0) {
            return { verdict: invert ? 'pass' : 'deny', condition: false };
        }

        return {
            verdict: pending === 0 && unevaluable > 0 ? 'unevaluable' : 'pending',
            condition: false,
        };
    }

    // decided on the outcome AFTER invert: what can this node still become?
    const outcomes = new Set(
        resolve(children).map((resolution) => negate(combine(strategy, resolution), invert)),
    );

    if (outcomes.size === 1 && outcomes.has('T')) {
        return { verdict: 'pass', condition: false };
    }

    if (outcomes.size === 1 && outcomes.has('F')) {
        return { verdict: 'deny', condition: false };
    }

    if (outcomes.has('T')) {
        return { verdict: 'pending', condition: true };
    }

    return { verdict: 'unevaluable', condition: false };
}

function readVerdict(result: PolicyEvaluationResult) : Verdict {
    if (result.success) {
        return 'pass';
    }

    if (result.pending) {
        return 'pending';
    }

    return result.unevaluable ? 'unevaluable' : 'deny';
}

function buildTablePolicy(strategy: DecisionStrategy, invert: boolean, children: Leaf[]) {
    return definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
        decisionStrategy: strategy,
        invert,
        children: children.map((type) => ({ type })),
    });
}

describe('src/policy (not evaluable): truth table', () => {
    describe.each(STRATEGIES)('%s', (strategy) => {
        describe.each([false, true])('invert: %s', (invert) => {
            it.each(MIXES.map((mix) => [mix.join(','), mix] as const))('children: %s', async (_label, mix) => {
                const policy = buildTablePolicy(strategy, invert, mix);
                const expectation = expected(strategy, invert, mix);

                const result = await tableEngine.evaluate(policy, definePolicyEvaluationContext({ withConditions: true }));

                expect(readVerdict(result)).toEqual(expectation.verdict);
                expect(result.success).toBe(expectation.verdict === 'pass');
                expect(!!result.pending).toBe(expectation.verdict === 'pending');
                expect(!!result.unevaluable).toBe(expectation.verdict === 'unevaluable');

                expect(!!result.pending && !!result.unevaluable).toBe(false);

                if (result.unevaluable) {
                    expect(result.condition).toBeUndefined();
                }

                expect(!!result.condition).toBe(expectation.condition);

                // the same verdict without the condition request
                const plain = await tableEngine.evaluate(policy, definePolicyEvaluationContext());

                expect(readVerdict(plain)).toEqual(expectation.verdict);
                expect(plain.condition).toBeUndefined();

                const predicate = result.condition ?
                    compileFilters(result.condition as IFilter | IFilters, { caseSensitive: true }) :
                    undefined;

                for (const flag of [true, false]) {
                    const row = { flag };
                    const full = await tableEngine.evaluate(policy, definePolicyEvaluationContext({ data: definePolicyData({ [ROW_KEY]: row }) }));

                    expect(full.pending).toBeFalsy();

                    if (result.pending) {
                        // a condition admits exactly the rows the full evaluation allows
                        if (predicate) {
                            expect(predicate(row), `flag: ${flag}`).toBe(full.success);
                        }
                    } else {
                        // what the gate settles, the full evaluation never contradicts
                        expect(full.success, `flag: ${flag}`).toBe(result.success);
                    }
                }
            });
        });
    });

    it('carries the issues of the children it could not evaluate', async () => {
        const result = await tableEngine.evaluate(
            buildTablePolicy(DecisionStrategy.UNANIMOUS, false, ['t', 'u']),
            definePolicyEvaluationContext(),
        );

        expect(result.unevaluable).toBe(true);
        expect(result.issues).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------
// The sources
// ---------------------------------------------------------------------

const identity = {
    type: 'user',
    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
};
const permission = { name: 'user_read' };

const throwingEvaluator : IPolicyEvaluator = {
    async evaluate(): Promise<PolicyEvaluationResult> {
        throw new Error('boom');
    },
};

const throwingRequiresEvaluator : IPolicyEvaluator = {
    requires() : string[] {
        throw new Error('boom');
    },

    async evaluate(): Promise<PolicyEvaluationResult> {
        return { success: true };
    },
};

const sourceEngine = new PolicyEngine({
    ...PolicyDefaultEvaluators,
    [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
    throwing: throwingEvaluator,
    throwingRequires: throwingRequiresEvaluator,
});

const bindingPolicy = definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {});
const bindingData = (grants: PermissionPolicyBinding[]) => definePolicyData({
    [BuiltInPolicyType.IDENTITY]: { ...identity, grants },
    [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
});

type Source = {
    policy: BasePolicy,
    data: () => PolicyData,
};

const SOURCES : [string, Source][] = [
    ['engine: a policy without a type', {
        policy: {},
        data: () => definePolicyData(),
    }],
    ['engine: no evaluator for the type', {
        policy: { type: 'unregistered' },
        data: () => definePolicyData(),
    }],
    ['engine: evaluate() throws', {
        policy: { type: 'throwing' },
        data: () => definePolicyData(),
    }],
    ['engine: requires() throws', {
        policy: { type: 'throwingRequires' },
        data: () => definePolicyData(),
    }],
    ['engine: the validator refuses the policy', {
        policy: definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: 'invalid' as unknown as Record<string, any> }),
        data: () => definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { name: 'admin' } }),
    }],
    ['composite: no children', {
        policy: definePolicyWithType(BuiltInPolicyType.COMPOSITE, { children: [] }),
        data: () => definePolicyData(),
    }],
    ['attributes: a query that does not parse', {
        policy: definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: { $foo: 'admin' } } }),
        data: () => definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { name: 'admin' } }),
    }],
    ['attributes: the attributes are empty', {
        policy: definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: { $eq: 'admin' } } }),
        data: () => definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: null as unknown as Record<string, any> }),
    }],
    ['identity: identity data the validator refuses', {
        policy: definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] }),
        data: () => definePolicyData({ [BuiltInPolicyType.IDENTITY]: undefined }),
    }],
    ['realm match: the attributes are empty', {
        policy: definePolicyWithType(BuiltInPolicyType.REALM_MATCH, {}),
        data: () => definePolicyData({
            [BuiltInPolicyType.IDENTITY]: identity,
            [BuiltInPolicyType.ATTRIBUTES]: null as unknown as Record<string, any>,
        }),
    }],
    ['attribute names: the names are not a list of strings', {
        policy: definePolicyWithType(BuiltInPolicyType.ATTRIBUTE_NAMES, { names: ['name'] }),
        data: () => definePolicyData({ [BuiltInPolicyType.ATTRIBUTE_NAMES]: [1] }),
    }],
    ['permission binding: no identity', {
        policy: bindingPolicy,
        data: () => definePolicyData({ [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] } }),
    }],
    ['permission binding: no binding data', {
        policy: bindingPolicy,
        data: () => definePolicyData({
            [BuiltInPolicyType.IDENTITY]: { ...identity, grants: [] },
            [BuiltInPolicyType.PERMISSION_BINDING]: null,
        }),
    }],
    ['permission binding: an identity without grants', {
        policy: bindingPolicy,
        data: () => definePolicyData({
            [BuiltInPolicyType.IDENTITY]: identity,
            [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
        }),
    }],
    ['permission binding: a grant policy containing a binding node', {
        policy: bindingPolicy,
        data: () => bindingData([{
            permission,
            realmScope: 'any',
            policies: [definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {})],
        }]),
    }],
    ['permission binding: a grant policy that could not be evaluated', {
        policy: bindingPolicy,
        data: () => bindingData([{
            permission,
            realmScope: 'any',
            policies: [{ type: 'unregistered' }],
        }]),
    }],
];

describe('src/policy (not evaluable): sources', () => {
    describe.each(SOURCES)('%s', (_label, source) => {
        it('is not evaluable', async () => {
            const result = await sourceEngine.evaluate(source.policy, definePolicyEvaluationContext({ data: source.data() }));

            expect(result.success).toBe(false);
            expect(result.pending).toBeFalsy();
            expect(result.unevaluable).toBe(true);
            expect(result.condition).toBeUndefined();
        });

        it('is not evaluable when it carries invert itself', async () => {
            const result = await sourceEngine.evaluate(
                { ...source.policy, invert: true },
                definePolicyEvaluationContext({ data: source.data() }),
            );

            expect(result.success).toBe(false);
            expect(result.pending).toBeFalsy();
            expect(result.unevaluable).toBe(true);
        });

        it('does not pass under an inverted parent', async () => {
            const parent : PolicyWithType = {
                type: BuiltInPolicyType.COMPOSITE,
                decisionStrategy: DecisionStrategy.UNANIMOUS,
                invert: true,
                children: [source.policy],
            };
            const result = await sourceEngine.evaluate(parent, definePolicyEvaluationContext({ data: source.data() }));

            expect(result.success).toBe(false);
            expect(result.pending).toBeFalsy();
            expect(result.unevaluable).toBe(true);
        });
    });

    // direct calls: through the engine the data gate answers these as pending
    it('marks a directly invoked attributes evaluator without its data', async () => {
        const evaluator = PolicyDefaultEvaluators[BuiltInPolicyType.ATTRIBUTES]!;
        const result = await evaluator.evaluate(
            definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: { $eq: 'admin' } } }),
            definePolicyEvaluationContext(),
        );

        expect(result).toMatchObject({ success: false, unevaluable: true });
        expect(result.pending).toBeFalsy();
    });

    it('marks a directly invoked identity evaluator without its data', async () => {
        const evaluator = PolicyDefaultEvaluators[BuiltInPolicyType.IDENTITY]!;
        const result = await evaluator.evaluate(
            definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] }),
            definePolicyEvaluationContext(),
        );

        expect(result).toMatchObject({ success: false, unevaluable: true });
        expect(result.pending).toBeFalsy();
    });

    it('marks a directly invoked realm match evaluator without an identity', async () => {
        const evaluator = PolicyDefaultEvaluators[BuiltInPolicyType.REALM_MATCH]!;
        const result = await evaluator.evaluate(
            definePolicyWithType(BuiltInPolicyType.REALM_MATCH, {}),
            definePolicyEvaluationContext(),
        );

        expect(result).toMatchObject({ success: false, unevaluable: true });
        expect(result.pending).toBeFalsy();
    });

    it('marks a directly invoked binding evaluator without binding data', async () => {
        const evaluator = new IdentityPermissionBindingPolicyEvaluator();
        const result = await evaluator.evaluate(
            bindingPolicy,
            definePolicyEvaluationContext({ data: definePolicyData({ [BuiltInPolicyType.IDENTITY]: { ...identity, grants: [] } }) }),
        );

        expect(result).toMatchObject({ success: false, unevaluable: true });
        expect(result.pending).toBeFalsy();
    });
});

describe('src/policy (not evaluable): a verdict still inverts', () => {
    const data = () => bindingData([]);

    it('settles an identity carrying an empty grants list false', async () => {
        const result = await sourceEngine.evaluate(bindingPolicy, definePolicyEvaluationContext({ data: data() }));

        expect(result.success).toBe(false);
        expect(result.pending).toBeFalsy();
        expect(result.unevaluable).toBeFalsy();
    });

    it('passes an identity carrying an empty grants list under an inverted parent', async () => {
        const parent = definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
            decisionStrategy: DecisionStrategy.UNANIMOUS,
            invert: true,
            children: [bindingPolicy],
        });
        const result = await sourceEngine.evaluate(parent, definePolicyEvaluationContext({ data: data() }));

        expect(result.success).toBe(true);
    });

    it('passes an identity carrying an empty grants list on an inverted binding node', async () => {
        const result = await sourceEngine.evaluate(
            definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, { invert: true }),
            definePolicyEvaluationContext({ data: data() }),
        );

        expect(result.success).toBe(true);
    });

    it('passes a denied identity type under an inverted parent', async () => {
        const parent = definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
            decisionStrategy: DecisionStrategy.UNANIMOUS,
            invert: true,
            children: [definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['client'] })],
        });
        const result = await sourceEngine.evaluate(
            parent,
            definePolicyEvaluationContext({ data: definePolicyData({ [BuiltInPolicyType.IDENTITY]: identity }) }),
        );

        expect(result.success).toBe(true);
    });
});
