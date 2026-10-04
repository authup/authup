/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PolicyEngine as BasePolicyEngine,
    BuiltInPolicyType,
    IdentityPermissionBindingPolicyEvaluator,
    PolicyDefaultEvaluators,
} from '@authup/access';

export class PolicyEngine extends BasePolicyEngine {
    /**
     * The binding evaluator reads the identity's grants from the policy data
     * (`PolicyDataKey.GRANTS`), so whoever places an identity in the bag loads
     * its grants first: a failed load then surfaces as itself instead of being
     * flattened into a denial inside the engine.
     */
    constructor() {
        super(PolicyDefaultEvaluators);

        this.registerEvaluator(BuiltInPolicyType.PERMISSION_BINDING, new IdentityPermissionBindingPolicyEvaluator());
    }
}
