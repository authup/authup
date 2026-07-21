/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPolicyEvaluator, PolicyEvaluationResult } from '../../evaluation';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { BuiltInPolicyType } from '../constants';
import { PermissionBindingPolicyValidator } from './validator';

export class PermissionBindingPolicyEvaluator implements IPolicyEvaluator {
    protected validator: PermissionBindingPolicyValidator;

    constructor() {
        this.validator = new PermissionBindingPolicyValidator();
    }

    requires() : string[] {
        // IDENTITY is deliberately NOT declared: a missing identity must stay a
        // settled deny (fail-closed), never a pending the pre-gate would permit.
        return [BuiltInPolicyType.PERMISSION_BINDING];
    }

    async evaluate(value: Record<string, any>): Promise<PolicyEvaluationResult> {
        const policy = await this.validator.run(value);

        // todo: this must be changed when the permission-checker not only checks owned permissions.
        return { success: maybeInvertPolicyOutcome(true, policy.invert) };
    }
}
