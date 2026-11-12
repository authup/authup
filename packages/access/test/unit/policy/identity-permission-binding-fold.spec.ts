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
    PolicyEvaluationContext,
    PolicyEvaluationResult,
    PolicyWithType,
} from '../../../src';
import {
    BuiltInPolicyType,
    IdentityPermissionBindingPolicyEvaluator,
    PolicyDefaultEvaluators,
    PolicyEngine,
    definePolicyData,
    definePolicyEvaluationContext,
    definePolicyWithType,
} from '../../../src';

// The grants of a permission are a disjunction of `reach AND grant policy` terms
// with the node's own `invert`. This spec checks the node against a reference
// that knows nothing of the evaluator: it enumerates every way the row could
// still turn out and computes the three-valued value of the node for each.

// in reach whatever the row, out of reach whatever the row, or decided by the row's realm
type Reach = 'in' | 'out' | 'row';
// none, settled true / false, pending, unevaluable, a binding node, and a
// pending composite that can only still pass or only still fail
type Policy = 'none' | 't' | 'f' | 'p' | 'q' | 'u' | 'b' | 'pass' | 'fail';
type Term = { reach: Reach, policy: Policy };
type Truth = 'T' | 'F' | 'U';
type Resolution = {
    // whether the row lies in the actor's own realm
    own: boolean,
    // one flag per pending leaf, in term order
    flags: boolean[],
};

const ROW_KEY = 'row';
const OWN_REALM_ID = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';
const FOREIGN_REALM_ID = '11111111-2222-4333-8444-555555555555';

const identity = {
    type: 'user',
    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
    realmId: OWN_REALM_ID,
};
const permission = { name: 'user_read' };

function createSettledEvaluator(success: boolean) : IPolicyEvaluator {
    return {
        async evaluate(): Promise<PolicyEvaluationResult> {
            return { success };
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
        const row = ctx.data.get<Record<string, unknown>>(ROW_KEY);

        return { success: row[value.field] === true };
    },
};

const engine = new PolicyEngine({
    ...PolicyDefaultEvaluators,
    [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
    t: createSettledEvaluator(true),
    f: createSettledEvaluator(false),
    p: rowEvaluator,
    // the same leaf without a condition form: it pends, and nothing lowers it
    q: { requires: rowEvaluator.requires, evaluate: rowEvaluator.evaluate },
});

const REACHES : Reach[] = ['in', 'out', 'row'];
const POLICIES : Policy[] = ['none', 't', 'f', 'p', 'q', 'u', 'b', 'pass', 'fail'];
const TERMS : Term[] = REACHES.flatMap((reach) => POLICIES.map((policy) => ({ reach, policy })));
const TERM_LISTS : Term[][] = [
    ...TERMS.map((term) => [term]),
    ...TERMS.flatMap((first) => TERMS.map((second) => [first, second])),
];

const SCOPES = {
    in: 'any',
    out: 'none',
    row: 'own',
} as const;

function isPending(policy: Policy) : boolean {
    return policy === 'p' || policy === 'q' || policy === 'pass' || policy === 'fail';
}

function buildGrantPolicy(policy: Policy, field: string) : BasePolicy | undefined {
    const leaf : PolicyWithType = { type: 'p', field };

    switch (policy) {
        case 'none': {
            return undefined;
        }
        case 'p': {
            return leaf;
        }
        case 'q': {
            const opaque : PolicyWithType = { type: 'q', field };

            return opaque;
        }
        case 'b': {
            return definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {});
        }
        case 'pass': {
            // (leaf or unknown): true or unknown
            return definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                decisionStrategy: DecisionStrategy.AFFIRMATIVE,
                children: [leaf, { type: 'u' }],
            });
        }
        case 'fail': {
            // (leaf and unknown): false or unknown
            return definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                decisionStrategy: DecisionStrategy.UNANIMOUS,
                children: [leaf, { type: 'u' }],
            });
        }
        default: {
            return { type: policy };
        }
    }
}

// the n-th pending term, in list order, reads the row field `f<n>`
function buildGrants(terms: Term[]) : PermissionPolicyBinding[] {
    let next = 0;

    return terms.map((term) => {
        const policy = buildGrantPolicy(term.policy, `f${next}`);

        if (isPending(term.policy)) {
            next++;
        }

        return {
            permission,
            realmScope: SCOPES[term.reach],
            ...(policy ? { policies: [policy] } : {}),
        };
    });
}

function describeTerms(terms: Term[], invert: boolean) : string {
    return `${invert ? 'not ' : ''}[${terms.map((term) => `${term.reach}:${term.policy}`).join(', ')}]`;
}

/**
 * The value of the node once the row is known. Without a resource realm every
 * reach passes (the gate check of a realm-less resource), which `realm` models.
 */
function valueOf(terms: Term[], invert: boolean, resolution: Resolution, realm: boolean) : Truth {
    let next = 0;

    const values = terms.map((term) : Truth => {
        let policy : Truth;
        let flag = false;

        if (isPending(term.policy)) {
            flag = resolution.flags[next]!;
            next++;
        }

        switch (term.policy) {
            case 'none':
            case 't': {
                policy = 'T';

                break;
            }
            case 'f': {
                policy = 'F';

                break;
            }
            case 'p':
            case 'q': {
                policy = flag ? 'T' : 'F';

                break;
            }
            case 'pass': {
                policy = flag ? 'T' : 'U';

                break;
            }
            case 'fail': {
                policy = flag ? 'U' : 'F';

                break;
            }
            default: {
                policy = 'U';
            }
        }

        let reach = true;

        if (realm && term.reach !== 'in') {
            reach = term.reach === 'row' && resolution.own;
        }

        // Kleene AND: out of reach is false whatever the policy
        return reach ? policy : 'F';
    });

    let value : Truth;

    // Kleene OR
    if (values.includes('T')) {
        value = 'T';
    } else {
        value = values.includes('U') ? 'U' : 'F';
    }

    if (value === 'U' || !invert) {
        return value;
    }

    return value === 'T' ? 'F' : 'T';
}

function buildResolutions(terms: Term[], realm: boolean) : Resolution[] {
    const count = terms.filter((term) => isPending(term.policy)).length;

    let flags : boolean[][] = [[]];

    for (let i = 0; i < count; i++) {
        flags = flags.flatMap((prefix) => [true, false].map((flag) => [...prefix, flag]));
    }

    const owns = realm ? [true, false] : [true];

    return owns.flatMap((own) => flags.map((item) => ({ own, flags: item })));
}

function buildRow(resolution: Resolution) : Record<string, unknown> {
    return {
        realmId: resolution.own ? OWN_REALM_ID : FOREIGN_REALM_ID,
        ...Object.fromEntries(resolution.flags.map((flag, index) => [`f${index}`, flag])),
    };
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

async function checkNode(terms: Term[], invert: boolean, withConditions: boolean) : Promise<void> {
    const label = `${describeTerms(terms, invert)}${withConditions ? ' with conditions' : ''}`;
    const node = definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, { invert });
    const grants = buildGrants(terms);
    const data = (extra: Record<string, unknown> = {}) => definePolicyData({
        [BuiltInPolicyType.IDENTITY]: { ...identity, grants },
        [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
        ...extra,
    });

    // a query build leaves the row's realm open; a plain evaluation without a
    // resource realm lets every reach pass
    const resolutions = buildResolutions(terms, withConditions);
    const values = resolutions.map((resolution) => valueOf(terms, invert, resolution, withConditions));
    const somePass = values.includes('T');
    const someFail = values.includes('F');

    const result = await engine.evaluate(node, definePolicyEvaluationContext({ data: data(), withConditions }));

    expect(!!result.pending && !!result.unevaluable, label).toBe(false);

    if (!withConditions || !result.pending) {
        expect(result.condition, label).toBeUndefined();
        expect(result.failCondition, label).toBeUndefined();
    }

    if (!result.pending) {
        expect(result.reachable, label).toBeUndefined();
    }

    if (result.reachable === 'fail') {
        expect(result.condition, label).toBeUndefined();
    }

    if (result.reachable === 'pass') {
        expect(result.failCondition, label).toBeUndefined();
    }

    if (new Set(values).size === 1) {
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

        // where every pending grant policy lowers, each side that can still be
        // reached has its condition, whatever could not be evaluated next to it
        const lowers = terms.every((term) => term.policy !== 'q');

        if (withConditions && lowers) {
            expect(!!result.condition, label).toBe(somePass);
            expect(!!result.failCondition, label).toBe(someFail);
        }
    }

    const passes = result.condition ?
        compileFilters(result.condition as IFilter | IFilters, { caseSensitive: true }) :
        undefined;
    const fails = result.failCondition ?
        compileFilters(result.failCondition as IFilter | IFilters, { caseSensitive: true }) :
        undefined;

    for (const [index, resolution] of resolutions.entries()) {
        const row = buildRow(resolution);
        const full = await engine.evaluate(node, definePolicyEvaluationContext({
            data: data({
                [ROW_KEY]: row,
                ...(withConditions ? { [BuiltInPolicyType.REALM_MATCH]: row.realmId } : {}),
            }),
        }));
        const hint = `${label} with ${JSON.stringify(row)}`;

        // once the row arrived, the node has exactly the value of the reference
        expect(readTruth(full), hint).toEqual(values[index]);

        // a side that is stated holds for exactly the rows that settle that way,
        // so neither holds for a row the node could not be evaluated on
        if (passes) {
            expect(passes(row), hint).toBe(values[index] === 'T');
        }

        if (fails) {
            expect(fails(row), hint).toBe(values[index] === 'F');
        }
    }
}

describe('identity permission binding grant disjunction (truth table)', () => {
    describe.each([false, true])('invert: %s', (invert) => {
        it.each([
            ['for a query build', true],
            ['without a resource realm', false],
        ])('holds %s', async (_label, withConditions) => {
            for (const terms of TERM_LISTS) {
                await checkNode(terms, invert, withConditions);
            }
        }, 60_000);
    });
});
