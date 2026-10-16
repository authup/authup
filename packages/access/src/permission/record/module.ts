/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '../../policy';
import { isPermissionError } from '../error';
import type { IPermissionEvaluator, PermissionEvaluationContext } from '../evaluator';
import type {
    RecordEvaluationContext,
    RecordTarget,
    RecordUpdateEvaluationContext,
} from './types';

function describeName(name: string | string[]): string {
    return Array.isArray(name) ? name.join(', ') : name;
}

/**
 * A fresh policy data bag for one record: the caller's data is cloned, never
 * written to, so one bag can be reused across records.
 */
function buildRecordData(name: string | string[], target: RecordTarget): PolicyData {
    if (typeof target.realm === 'undefined') {
        throw new Error(`The record realm for permission ${describeName(name)} is undefined.`);
    }

    let data : PolicyData;
    if (target.data instanceof PolicyData) {
        data = target.data.clone();
    } else {
        data = new PolicyData({ ...(target.data || {}) });
    }

    if (data.has(BuiltInPolicyType.REALM_MATCH)) {
        throw new Error(`The policy data for permission ${describeName(name)} must not carry ${BuiltInPolicyType.REALM_MATCH}.`);
    }

    if (typeof target.attributes !== 'undefined') {
        if (data.has(BuiltInPolicyType.ATTRIBUTES)) {
            throw new Error(
                `The record attributes for permission ${describeName(name)} are given twice (attributes and data).`,
            );
        }

        data.set(BuiltInPolicyType.ATTRIBUTES, target.attributes);
    }

    data.set(BuiltInPolicyType.REALM_MATCH, target.realm);

    return data;
}

function buildEvaluationContext(ctx: RecordEvaluationContext): PermissionEvaluationContext {
    return {
        name: ctx.name,
        data: buildRecordData(ctx.name, ctx),
        options: ctx.options,
    };
}

/**
 * Throws a permission error unless `name` passes for the record: each grant's
 * `realm_scope` is matched against the record's realm and its policies are
 * evaluated against the record. An array of names must ALL pass, like
 * `evaluate()`.
 */
export async function evaluateRecord(
    evaluator: IPermissionEvaluator,
    ctx: RecordEvaluationContext,
): Promise<void> {
    await evaluator.evaluate(buildEvaluationContext(ctx));
}

/** {@link evaluateRecord} where ANY of the names suffices, like `evaluateOneOf()`. */
export async function evaluateRecordOneOf(
    evaluator: IPermissionEvaluator,
    ctx: RecordEvaluationContext,
): Promise<void> {
    await evaluator.evaluateOneOf(buildEvaluationContext(ctx));
}

async function asPredicate(fn: () => Promise<void>): Promise<boolean> {
    try {
        await fn();
        return true;
    } catch (error) {
        if (isPermissionError(error)) {
            return false;
        }

        throw error;
    }
}

/**
 * {@link evaluateRecord} as a predicate. Only a permission error reads as
 * `false`; anything else propagates, so a failure on the authorization path
 * never turns into a quiet "not authorized".
 */
export async function reachesRecord(
    evaluator: IPermissionEvaluator,
    ctx: RecordEvaluationContext,
): Promise<boolean> {
    return asPredicate(() => evaluateRecord(evaluator, ctx));
}

/** {@link evaluateRecordOneOf} as a predicate, like {@link reachesRecord}. */
export async function reachesRecordOneOf(
    evaluator: IPermissionEvaluator,
    ctx: RecordEvaluationContext,
): Promise<boolean> {
    return asPredicate(() => evaluateRecordOneOf(evaluator, ctx));
}

/**
 * An update passes only when `name` passes for BOTH the stored row (the actor
 * may only change a row it can already reach) and the updated row (the row
 * must stay in reach afterwards). Evaluating the updated row alone lets an
 * update move a row INTO reach.
 */
export async function evaluateRecordUpdate(
    evaluator: IPermissionEvaluator,
    ctx: RecordUpdateEvaluationContext,
): Promise<void> {
    await evaluateRecord(evaluator, {
        name: ctx.name, 
        options: ctx.options, 
        ...ctx.current, 
    });
    await evaluateRecord(evaluator, {
        name: ctx.name, 
        options: ctx.options, 
        ...ctx.next, 
    });
}

/**
 * Whether a grant of `name` (any of, for an array) reaches every realm with
 * no narrowing policy, i.e. `realm_scope: any`. Reads the `compile()`
 * verdict, so it relies on the binding policy (`system.default`) being bound
 * to the permission: without it a grant's reach is never evaluated and any
 * grant compiles to `allow`. Fail-closed: a policy-bearing `any` grant
 * compiles to `conditional` and reads as `false`.
 */
export async function hasUnboundedReach(
    evaluator: IPermissionEvaluator,
    name: string | string[],
): Promise<boolean> {
    const result = await evaluator.compile({ name });
    return result.verdict === 'allow';
}
