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
    PermissionEvaluator,
    PermissionMemoryProvider,
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

// settled true / false, pending with and without a condition form, unevaluable
type Leaf = 't' | 'f' | 'p' | 'q' | 'u';
type Node = {
    strategy: DecisionStrategy,
    invert: boolean,
    children: Tree[],
};
type Tree = Leaf | Node;
type Truth = 'T' | 'F' | 'U';

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

// pends while the bag carries no row, and settles on its own field of the row once it does
const rowEvaluator : IPolicyEvaluator = {
    requires() : string[] {
        return [ROW_KEY];
    },

    async toCondition(value: Record<string, any>) : Promise<ICondition | null> {
        return eq(value.field, true);
    },

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        const row = ctx.data.get<Record<string, boolean>>(ROW_KEY);

        return { success: row[value.field] === true };
    },
};

// the same leaf without a condition form: it pends, and nothing lowers it
const opaqueRowEvaluator : IPolicyEvaluator = {
    requires: rowEvaluator.requires,
    evaluate: rowEvaluator.evaluate,
};

const tableEngine = new PolicyEngine({
    ...PolicyDefaultEvaluators,
    t: createSettledEvaluator(true),
    f: createSettledEvaluator(false),
    p: rowEvaluator,
    q: opaqueRowEvaluator,
});

const LEAVES : Leaf[] = ['t', 'f', 'p', 'q', 'u'];
const STRATEGIES = [
    DecisionStrategy.AFFIRMATIVE,
    DecisionStrategy.UNANIMOUS,
    DecisionStrategy.CONSENSUS,
];

// every ordered mix of the given sizes, which covers every multiset in every order
function buildMixes<T>(items: T[], sizes: number[]) : T[][] {
    const build = (size: number) : T[][] => {
        if (size === 0) {
            return [[]];
        }

        return build(size - 1).flatMap((rest) => items.map((item) => [item, ...rest]));
    };

    return sizes.flatMap((size) => build(size));
}

function buildNodes(children: Tree[][]) : Node[] {
    return STRATEGIES.flatMap((strategy) => [false, true].flatMap((invert) => children.map((mix) => ({
        strategy,
        invert,
        children: mix,
    }))));
}

function isLeaf(tree: Tree) : tree is Leaf {
    return typeof tree === 'string';
}

function describeTree(tree: Tree) : string {
    if (isLeaf(tree)) {
        return tree;
    }

    return `${tree.invert ? 'not ' : ''}${tree.strategy}(${tree.children.map((child) => describeTree(child)).join(', ')})`;
}

function isPendingLeaf(leaf: Leaf) : boolean {
    return leaf === 'p' || leaf === 'q';
}

function countPending(tree: Tree) : number {
    if (isLeaf(tree)) {
        return isPendingLeaf(tree) ? 1 : 0;
    }

    return tree.children.reduce((sum, child) => sum + countPending(child), 0);
}

function hasConsensus(tree: Tree) : boolean {
    if (isLeaf(tree)) {
        return false;
    }

    return tree.strategy === DecisionStrategy.CONSENSUS ||
        tree.children.some((child) => hasConsensus(child));
}

function hasOpaqueLeaf(tree: Tree) : boolean {
    if (isLeaf(tree)) {
        return tree === 'q';
    }

    return tree.children.some((child) => hasOpaqueLeaf(child));
}

// the n-th pending leaf, in tree order, reads the row field `f<n>`
function buildPolicy(tree: Tree, counter: { next: number } = { next: 0 }) : BasePolicy {
    if (isLeaf(tree)) {
        if (isPendingLeaf(tree)) {
            const policy : PolicyWithType = { type: tree, field: `f${counter.next}` };

            counter.next++;

            return policy;
        }

        return { type: tree };
    }

    return definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
        decisionStrategy: tree.strategy,
        invert: tree.invert,
        children: tree.children.map((child) => buildPolicy(child, counter)),
    });
}

// every way the pending leaves could still resolve, one flag per leaf in tree order
function buildResolutions(count: number) : boolean[][] {
    return buildMixes([true, false], [count]);
}

function buildRow(resolution: boolean[]) : Record<string, boolean> {
    return Object.fromEntries(resolution.map((flag, index) => [`f${index}`, flag]));
}

// The value of the tree once every pending leaf resolved. An unevaluable leaf is
// an unknown that never resolves (Kleene), and `invert` moves settled values only.
function valueOf(tree: Tree, resolution: boolean[], counter: { next: number } = { next: 0 }) : Truth {
    if (isLeaf(tree)) {
        if (isPendingLeaf(tree)) {
            const flag = resolution[counter.next];

            counter.next++;

            return flag ? 'T' : 'F';
        }

        if (tree === 'u') {
            return 'U';
        }

        return tree === 't' ? 'T' : 'F';
    }

    const children = tree.children.map((child) => valueOf(child, resolution, counter));

    let value : Truth;

    if (tree.strategy === DecisionStrategy.AFFIRMATIVE) {
        if (children.includes('T')) {
            value = 'T';
        } else {
            value = children.includes('U') ? 'U' : 'F';
        }
    } else if (tree.strategy === DecisionStrategy.UNANIMOUS) {
        if (children.includes('F')) {
            value = 'F';
        } else {
            value = children.includes('U') ? 'U' : 'T';
        }
    } else {
        // the majority of the settled children, as long as the unknown ones could not turn it
        const count = children.filter((child) => child === 'T').length -
            children.filter((child) => child === 'F').length;
        const unknown = children.filter((child) => child === 'U').length;

        if (count - unknown > 0) {
            value = 'T';
        } else {
            value = count + unknown <= 0 ? 'F' : 'U';
        }
    }

    if (value === 'U' || !tree.invert) {
        return value;
    }

    return value === 'T' ? 'F' : 'T';
}

function readTruth(result: PolicyEvaluationResult) : Truth | undefined {
    if (result.pending) {
        return undefined;
    }

    if (result.success) {
        return 'T';
    }

    return result.unevaluable ? 'U' : 'F';
}

async function checkTree(tree: Node) : Promise<void> {
    const label = describeTree(tree);
    const policy = buildPolicy(tree);
    const resolutions = buildResolutions(countPending(tree));
    const values = resolutions.map((resolution) => valueOf(tree, resolution));
    const somePass = values.includes('T');
    const someFail = values.includes('F');
    const someUnknown = values.includes('U');

    const result = await tableEngine.evaluate(policy, definePolicyEvaluationContext({ withConditions: true }));

    // the invariants of the result shape
    expect(!!result.pending && !!result.unevaluable, label).toBe(false);
    expect(result.success && (!!result.pending || !!result.unevaluable), label).toBe(false);

    if (!result.pending) {
        expect(result.condition, label).toBeUndefined();
        expect(result.failCondition, label).toBeUndefined();
        expect(result.reachable, label).toBeUndefined();
    }

    if (result.reachable === 'fail') {
        expect(result.condition, label).toBeUndefined();
    }

    if (result.reachable === 'pass') {
        expect(result.failCondition, label).toBeUndefined();
    }

    // soundness, for every strategy
    if (somePass) {
        expect(result.success || (!!result.pending && result.reachable !== 'fail'), label).toBe(true);
    }

    if (someFail || someUnknown) {
        expect(result.success, label).toBe(false);
    }

    if (someFail) {
        expect(result.reachable, label).not.toEqual('pass');
    }

    if (somePass || someFail) {
        expect(!!result.unevaluable, label).toBe(false);
    }

    if (hasConsensus(tree)) {
        // a threshold over unknown children only narrows soundly, never exactly
        if (!result.pending) {
            expect(new Set(values), label).toEqual(new Set([readTruth(result)]));
        }
    } else if (new Set(values).size === 1) {
        expect(readTruth(result), label).toEqual(values[0]);
    } else {
        let reachable : 'pass' | 'fail' | undefined;

        if (!someFail) {
            reachable = 'pass';
        } else if (!somePass) {
            reachable = 'fail';
        }

        expect(result.pending, label).toBe(true);
        expect(result.reachable, label).toEqual(reachable);

        // where every pending leaf lowers, each side that can still be reached
        // has its condition, whatever could not be evaluated next to it
        if (!hasOpaqueLeaf(tree)) {
            expect(!!result.condition, label).toBe(somePass);
            expect(!!result.failCondition, label).toBe(someFail);
        }
    }

    // the same verdict without the condition request
    const plain = await tableEngine.evaluate(policy, definePolicyEvaluationContext());

    expect(plain.condition, label).toBeUndefined();
    expect(plain.failCondition, label).toBeUndefined();
    expect(readTruth(plain), label).toEqual(readTruth(result));
    expect(plain.reachable, label).toEqual(result.reachable);

    const passes = result.condition ?
        compileFilters(result.condition as IFilter | IFilters, { caseSensitive: true }) :
        undefined;
    const fails = result.failCondition ?
        compileFilters(result.failCondition as IFilter | IFilters, { caseSensitive: true }) :
        undefined;

    for (const [index, resolution] of resolutions.entries()) {
        const row = buildRow(resolution);
        const full = await tableEngine.evaluate(policy, definePolicyEvaluationContext({ data: definePolicyData({ [ROW_KEY]: row }) }));
        const hint = `${label} with ${JSON.stringify(row)}`;

        // once the data arrived, the tree has exactly the value of the reference
        expect(readTruth(full), hint).toEqual(values[index]);

        // a side that is stated holds for exactly the rows that settle that way,
        // so neither holds for a row the tree could not be evaluated on
        if (passes) {
            expect(passes(row), hint).toBe(values[index] === 'T');
        }

        if (fails) {
            expect(fails(row), hint).toBe(values[index] === 'F');
        }
    }
}

const LEAF_MIXES = buildMixes<Tree>(LEAVES, [1, 2, 3]);

// a child is a leaf, or a composite of any strategy and inversion over one or two leaves
const CHILDREN : Tree[] = [...LEAVES, ...buildNodes(buildMixes<Tree>(LEAVES, [1, 2]))];
const CHILD_MIXES = buildMixes(CHILDREN, [1, 2]);

describe('src/policy (not evaluable): truth table', () => {
    describe.each(STRATEGIES)('%s', (strategy) => {
        describe.each([false, true])('invert: %s', (invert) => {
            it.each(LEAF_MIXES.map((mix) => [mix.join(','), mix] as const))('children: %s', async (_label, mix) => {
                await checkTree({
                    strategy,
                    invert,
                    children: mix,
                });
            });

            it('holds two levels deep', async () => {
                // a consensus root discards every side, so a leaf that does not
                // lower pins nothing there its lowering twin does not
                const mixes = strategy === DecisionStrategy.CONSENSUS ?
                    CHILD_MIXES.filter((mix) => mix.every((child) => !hasOpaqueLeaf(child))) :
                    CHILD_MIXES;

                for (const mix of mixes) {
                    await checkTree({
                        strategy,
                        invert,
                        children: mix,
                    });
                }
            }, 120_000);
        });
    });

    // A lowered leaf next to a pending part that does not lower and a part that
    // could not be evaluated: the inner affirmative node knows where it passes but
    // not where it fails. A negating ancestor must not read the rest as failure.
    it('never negates a pass condition whose fail side is unknown', async () => {
        const affirmative : Node = {
            strategy: DecisionStrategy.AFFIRMATIVE,
            invert: false,
            children: ['p', {
                strategy: DecisionStrategy.UNANIMOUS,
                invert: false,
                children: ['q', 'u'],
            }],
        };
        const tree : Node = {
            strategy: DecisionStrategy.UNANIMOUS,
            invert: true,
            children: [affirmative],
        };
        const policy = buildPolicy(tree);

        const inner = await tableEngine.evaluate(
            buildPolicy(affirmative),
            definePolicyEvaluationContext({ withConditions: true }),
        );

        expect(inner.pending).toBe(true);
        expect(inner.condition).toBeDefined();
        expect(inner.failCondition).toBeUndefined();

        const result = await tableEngine.evaluate(policy, definePolicyEvaluationContext({ withConditions: true }));

        expect(result.pending).toBe(true);
        expect(result.condition).toBeUndefined();
        expect(result.failCondition).toBeDefined();

        // the row the negated condition would have admitted
        const full = await tableEngine.evaluate(
            policy,
            definePolicyEvaluationContext({ data: definePolicyData({ [ROW_KEY]: { f0: false, f1: true } }) }),
        );

        expect(full.success).toBe(false);
        expect(full.unevaluable).toBe(true);

        await checkTree(tree);
    });

    it('carries the issues of the children it could not evaluate', async () => {
        const result = await tableEngine.evaluate(
            buildPolicy({
                strategy: DecisionStrategy.UNANIMOUS,
                invert: false,
                children: ['t', 'u'],
            }),
            definePolicyEvaluationContext(),
        );

        expect(result.unevaluable).toBe(true);
        expect(result.issues).toHaveLength(1);
    });

    it('keeps the issues of a child it could not evaluate while it pends', async () => {
        const result = await tableEngine.evaluate(
            buildPolicy({
                strategy: DecisionStrategy.AFFIRMATIVE,
                invert: false,
                children: ['p', 'u'],
            }),
            definePolicyEvaluationContext(),
        );

        expect(result.pending).toBe(true);
        expect(result.reachable).toEqual('pass');
        expect(JSON.stringify(result.issues)).toContain('can not be handled');
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

describe('src/policy (not evaluable): a custom evaluator flagging both', () => {
    const mixedEvaluator : IPolicyEvaluator = {
        async evaluate(): Promise<PolicyEvaluationResult> {
            return {
                success: false,
                pending: true,
                unevaluable: true,
                condition: eq('name', 'admin'),
            };
        },
    };

    const mixedEngine = new PolicyEngine({
        ...PolicyDefaultEvaluators,
        mixed: mixedEvaluator,
    });

    it('is not evaluable without pending or a condition', async () => {
        const result = await mixedEngine.evaluate(
            { type: 'mixed' },
            definePolicyEvaluationContext({ withConditions: true }),
        );

        expect(result.success).toBe(false);
        expect(result.unevaluable).toBe(true);
        expect(result.pending).toBeUndefined();
        expect(result.condition).toBeUndefined();
    });

    const permissionEvaluator = new PermissionEvaluator({
        provider: new PermissionMemoryProvider([
            { permission: { name: 'mixed' }, policies: [{ type: 'mixed' }] },
        ]),
        policyEngine: mixedEngine,
    });

    it('is refused by the pre-gate', async () => {
        await expect(permissionEvaluator.preEvaluate({ name: 'mixed' })).rejects.toThrow();
    });

    it('compiles to deny', async () => {
        const result = await permissionEvaluator.compile({ name: 'mixed' });

        expect(result.verdict).toEqual('deny');
    });
});

describe('src/policy (not evaluable): what a custom evaluator states', () => {
    const condition = eq('name', 'admin');
    const failCondition = eq('name', 'guest');
    const stub = (result: PolicyEvaluationResult) : IPolicyEvaluator => ({
        async evaluate(): Promise<PolicyEvaluationResult> {
            return result;
        },
    });

    const engine = new PolicyEngine({
        ...PolicyDefaultEvaluators,
        settled: stub({
            success: false,
            reachable: 'pass',
            condition,
            failCondition,
        }),
        passOnly: stub({
            success: false,
            pending: true,
            reachable: 'pass',
            condition,
            failCondition,
        }),
        failOnly: stub({
            success: false,
            pending: true,
            reachable: 'fail',
            condition,
            failCondition,
        }),
        single: stub({
            success: false,
            pending: true,
            condition,
        }),
    });
    const evaluate = (type: string, policy: Record<string, any> = {}) => engine.evaluate(
        { ...policy, type },
        definePolicyEvaluationContext({ withConditions: true }),
    );

    it('drops everything a pending result carries from one that is not pending', async () => {
        const result = await evaluate('settled');

        expect(result.success).toBe(false);
        expect(result.reachable).toBeUndefined();
        expect(result.condition).toBeUndefined();
        expect(result.failCondition).toBeUndefined();
    });

    it('drops the fail condition of a result that can only still pass', async () => {
        const result = await evaluate('passOnly');

        expect(result.pending).toBe(true);
        expect(result.reachable).toEqual('pass');
        expect(result.condition).toEqual(condition);
        expect(result.failCondition).toBeUndefined();
    });

    it('drops the pass condition of a result that can only still fail', async () => {
        const result = await evaluate('failOnly');

        expect(result.pending).toBe(true);
        expect(result.reachable).toEqual('fail');
        expect(result.condition).toBeUndefined();
        expect(result.failCondition).toEqual(failCondition);
    });

    // an absent side is unknown: the engine never guesses where a result an
    // evaluator returned fails, so a negating parent has nothing to pass on
    it('takes a pass condition without a fail condition as stated', async () => {
        const result = await evaluate('single');

        expect(result.pending).toBe(true);
        expect(result.condition).toEqual(condition);
        expect(result.failCondition).toBeUndefined();

        const negated = await engine.evaluate(
            definePolicyWithType(BuiltInPolicyType.COMPOSITE, { invert: true, children: [{ type: 'single' }] }),
            definePolicyEvaluationContext({ withConditions: true }),
        );

        expect(negated.pending).toBe(true);
        expect(negated.condition).toBeUndefined();
        expect(negated.failCondition).toEqual(condition);
    });

    it('derives the fail condition of a leaf it lowers itself', async () => {
        const leaf : PolicyWithType = { type: 'p', field: 'flag' };
        const result = await tableEngine.evaluate(leaf, definePolicyEvaluationContext({ withConditions: true }));

        expect(result.pending).toBe(true);
        expect(result.condition).toBeDefined();
        expect(result.failCondition).toBeDefined();

        const passes = compileFilters(result.condition as IFilter | IFilters, { caseSensitive: true });
        const fails = compileFilters(result.failCondition as IFilter | IFilters, { caseSensitive: true });

        for (const row of [{ flag: true }, { flag: false }, { flag: null }, {}]) {
            expect(fails(row), JSON.stringify(row)).toBe(!passes(row));
        }
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
