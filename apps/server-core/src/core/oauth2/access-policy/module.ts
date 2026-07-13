/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    PolicyData,
    definePolicyEvaluationContext,
} from '@authup/access';
import type { BasePolicy, IdentityPolicyData } from '@authup/access';
import type { Logger } from '@authup/server-kit';
import { PolicyEngine } from '../../security/policy/engine.ts';
import type {
    IOAuth2AccessPolicyEvaluator,
    IOAuth2AccessPolicyProvider,
    OAuth2AccessPolicyEvaluatorContext,
} from './types.ts';

export class OAuth2AccessPolicyEvaluator implements IOAuth2AccessPolicyEvaluator {
    protected policyProvider : IOAuth2AccessPolicyProvider;

    protected engine : PolicyEngine;

    protected logger? : Logger;

    constructor(ctx: OAuth2AccessPolicyEvaluatorContext) {
        this.policyProvider = ctx.policyProvider;
        this.engine = new PolicyEngine(ctx.identityPermissionProvider);
        this.logger = ctx.logger;
    }

    async evaluate(policyId: string, subject: IdentityPolicyData): Promise<boolean> {
        let tree : BasePolicy | null;

        try {
            tree = await this.policyProvider.findDescendantsTreeById(policyId);
        } catch (e) {
            this.logger?.warn(`Loading the access policy ${policyId} failed.`, { error: e });
            return false;
        }

        if (!tree) {
            return false;
        }

        const ctx = definePolicyEvaluationContext({ data: new PolicyData({ [BuiltInPolicyType.IDENTITY]: subject }) });

        const result = await this.engine.evaluate(tree, ctx);

        return result.success;
    }
}
