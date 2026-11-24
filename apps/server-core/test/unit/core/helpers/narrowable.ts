/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionEvaluator, PermissionPolicyBinding } from '@authup/access';
import type { INarrowablePermissionEvaluator } from '@authup/server-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';

/**
 * An actor evaluator over `evaluator`. Without `narrowing`, a narrowed copy
 * denies everything, so no single grant passes a gate on its own.
 */
export function toNarrowable(
    evaluator: IPermissionEvaluator,
    narrowing?: (grants: PermissionPolicyBinding[]) => IPermissionEvaluator,
): INarrowablePermissionEvaluator {
    return {
        evaluate: (ctx) => evaluator.evaluate(ctx),
        evaluateOneOf: (ctx) => evaluator.evaluateOneOf(ctx),
        preEvaluate: (ctx) => evaluator.preEvaluate(ctx),
        preEvaluateOneOf: (ctx) => evaluator.preEvaluateOneOf(ctx),
        compile: (ctx) => evaluator.compile(ctx),
        narrowGrants: (grants) => {
            if (narrowing) {
                return narrowing(grants);
            }

            const denied = new FakePermissionEvaluator();

            denied.denyAll();

            return denied;
        },
    };
}
