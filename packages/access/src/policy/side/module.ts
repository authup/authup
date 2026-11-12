/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import { and, or } from '@rapiq/core';
import type { PolicyEvaluationResult } from '../evaluation';
import type { PolicySide, PolicySides } from './types';

export const POLICY_SIDE_ALWAYS : PolicySide = { kind: 'always' };
export const POLICY_SIDE_NEVER : PolicySide = { kind: 'never' };
export const POLICY_SIDE_UNKNOWN : PolicySide = { kind: 'unknown' };

export function definePolicySide(condition?: ICondition | null) : PolicySide {
    return condition ? { kind: 'condition', condition } : POLICY_SIDE_UNKNOWN;
}

function combine(
    sides: PolicySide[],
    absorbing: PolicySide,
    neutral: PolicySide,
    join: (...conditions: ICondition[]) => ICondition,
) : PolicySide {
    const conditions : ICondition[] = [];
    let unknown = false;

    for (const side of sides) {
        if (side.kind === absorbing.kind) {
            return absorbing;
        }

        if (side.kind === 'unknown') {
            unknown = true;
        } else if (side.kind === 'condition') {
            conditions.push(side.condition);
        }
    }

    if (unknown) {
        return POLICY_SIDE_UNKNOWN;
    }

    if (conditions.length === 0) {
        return neutral;
    }

    return definePolicySide(conditions.length === 1 ? conditions[0] : join(...conditions));
}

/**
 * The rows any of the sides holds for.
 */
export function anyOfPolicySides(sides: PolicySide[]) : PolicySide {
    return combine(sides, POLICY_SIDE_ALWAYS, POLICY_SIDE_NEVER, or);
}

/**
 * The rows all of the sides hold for.
 */
export function allOfPolicySides(sides: PolicySide[]) : PolicySide {
    return combine(sides, POLICY_SIDE_NEVER, POLICY_SIDE_ALWAYS, and);
}

export function invertPolicySides(sides: PolicySides, invert?: boolean | null) : PolicySides {
    return invert ? { pass: sides.fail, fail: sides.pass } : sides;
}

/**
 * The sides an evaluation result states. A side a pending result says nothing
 * about is unknown.
 */
export function readPolicySides(result: PolicyEvaluationResult) : PolicySides {
    if (result.pending) {
        return {
            pass: result.reachable === 'fail' ? POLICY_SIDE_NEVER : definePolicySide(result.condition),
            fail: result.reachable === 'pass' ? POLICY_SIDE_NEVER : definePolicySide(result.failCondition),
        };
    }

    if (result.unevaluable) {
        return { pass: POLICY_SIDE_NEVER, fail: POLICY_SIDE_NEVER };
    }

    return result.success ?
        { pass: POLICY_SIDE_ALWAYS, fail: POLICY_SIDE_NEVER } :
        { pass: POLICY_SIDE_NEVER, fail: POLICY_SIDE_ALWAYS };
}

/**
 * What a pending result states about its sides: which settled outcome is still
 * open, and the condition of each side that has one.
 */
export function writePolicySides(
    sides: PolicySides,
    withConditions: boolean,
) : Pick<PolicyEvaluationResult, 'reachable' | 'condition' | 'failCondition'> {
    const output : Pick<PolicyEvaluationResult, 'reachable' | 'condition' | 'failCondition'> = {};

    if (sides.pass.kind === 'never') {
        output.reachable = 'fail';
    } else if (sides.fail.kind === 'never') {
        output.reachable = 'pass';
    }

    if (withConditions) {
        if (sides.pass.kind === 'condition') {
            output.condition = sides.pass.condition;
        }

        if (sides.fail.kind === 'condition') {
            output.failCondition = sides.fail.condition;
        }
    }

    return output;
}
