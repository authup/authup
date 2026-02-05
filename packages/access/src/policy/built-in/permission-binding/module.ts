/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PermissionBindingPolicy } from './types';
import { PermissionBindingPolicyValidator } from './validator';

export class PermissionBindingPolicyEvaluator implements IPolicyEvaluator<PermissionBindingPolicy> {
    protected validator: PermissionBindingPolicyValidator;

    constructor() {
        this.validator = new PermissionBindingPolicyValidator();
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // todo: this must be changed when the permission-checker not only checks owned permissions.
        return maybeInvertPolicyOutcome(true, ctx.config.invert);
    }
}
