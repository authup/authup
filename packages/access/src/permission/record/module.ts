/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '../../policy';
import { isPermissionError } from '../error';
import type { IPermissionEvaluator } from '../evaluator';
import type { RecordReach } from './types';

/**
 * The evaluation input for one record. The `realmMatch` key is what applies
 * each grant's `realm_scope`: `attributes` alone apply none.
 */
export function buildRecordPolicyData(reach: RecordReach): PolicyData {
    return new PolicyData({
        [BuiltInPolicyType.REALM_MATCH]: reach.realmId ?? null,
        [BuiltInPolicyType.ATTRIBUTES]: reach.attributes ?? {},
    });
}

/**
 * Throws a permission error unless a grant of `name` (any of, for an array)
 * reaches the record's realm and satisfies its policies.
 */
export async function assertRecordReach(
    evaluator: IPermissionEvaluator,
    name: string | string[],
    reach: RecordReach,
): Promise<void> {
    const data = buildRecordPolicyData(reach);

    if (Array.isArray(name)) {
        await evaluator.evaluateOneOf({ name, data });
        return;
    }

    await evaluator.evaluate({ name, data });
}

/**
 * {@link assertRecordReach} as a predicate. Only a permission error reads as
 * `false`; anything else propagates, so a failure on the authorization path
 * never turns into a quiet "not authorized".
 */
export async function reachesRecord(
    evaluator: IPermissionEvaluator,
    name: string | string[],
    reach: RecordReach,
): Promise<boolean> {
    try {
        await assertRecordReach(evaluator, name, reach);
        return true;
    } catch (error) {
        if (isPermissionError(error)) {
            return false;
        }

        throw error;
    }
}

/**
 * Whether a grant of `name` (any of, for an array) reaches every realm with
 * no narrowing policy, i.e. `realm_scope: any`. The replacement for "is a
 * master-realm member". Fail-closed: a policy-bearing `any` grant compiles to
 * `conditional` and reads as `false`.
 */
export async function hasUnboundedReach(
    evaluator: IPermissionEvaluator,
    name: string | string[],
): Promise<boolean> {
    try {
        const result = await evaluator.compile({ name });
        return result.verdict === 'allow';
    } catch (error) {
        if (isPermissionError(error)) {
            return false;
        }

        throw error;
    }
}
