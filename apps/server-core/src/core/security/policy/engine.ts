/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyEngine as BasePolicyEngine, BuiltInPolicyType, PolicyDefaultEvaluators } from '@authup/access';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import { PermissionBindingPolicyEvaluator } from './evaluator.ts';

export class PolicyEngine extends BasePolicyEngine {
    constructor(identityPermissionProvider: IIdentityPermissionProvider) {
        super(PolicyDefaultEvaluators);

        this.registerEvaluator(BuiltInPolicyType.PERMISSION_BINDING, new PermissionBindingPolicyEvaluator(identityPermissionProvider));
    }
}
