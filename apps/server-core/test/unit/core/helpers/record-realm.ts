/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/access';
import type { FakePermissionEvaluator } from '@authup/server-test-kit';

/**
 * The record realms the full evaluations of `name` carried, in call order:
 * an update evaluates the stored row and then the updated row.
 */
export function readEvaluatedRecordRealms(
    evaluator: FakePermissionEvaluator,
    name: string,
): unknown[] {
    return evaluator.evaluateCalls
        .filter((call) => call.name === name)
        .map((call) => call.data!.get(BuiltInPolicyType.REALM_MATCH));
}
