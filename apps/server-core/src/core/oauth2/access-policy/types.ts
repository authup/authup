/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy, IdentityPolicyData, PolicyData } from '@authup/access';
import type { Logger } from '@authup/server-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';

/**
 * The tree the provider loads. At runtime it is the policy entity, whose root
 * carries the realm it belongs to; `BasePolicy` alone does not, so the realm
 * is declared optional here and read defensively.
 */
export type OAuth2AccessPolicyTree = BasePolicy & {
    realmId?: string | null,
};

export type OAuth2AccessPolicyEvaluateDataOptions = {
    /**
     * When given, a tree whose realm is neither global (`null`) nor this one
     * denies: a realm's provider must not evaluate another realm's policy.
     */
    realmId?: string | null,
};

export interface IOAuth2AccessPolicyEvaluator {
    /**
     * true = access permitted. A present-but-unresolvable policy id,
     * a load failure, or an evaluation failure all yield false (fail closed).
     */
    evaluate(policyId: string, subject: IdentityPolicyData): Promise<boolean>;

    /**
     * The same fail-closed load and evaluation over a caller-built bag, for
     * a decision with no identity behind it (the enrollment gate evaluates
     * the user row a first federated login would create).
     */
    evaluateData(
        policyId: string,
        data: PolicyData,
        options?: OAuth2AccessPolicyEvaluateDataOptions,
    ): Promise<boolean>;
}

export interface IOAuth2AccessPolicyProvider {
    findDescendantsTreeById(id: string): Promise<OAuth2AccessPolicyTree | null>;
}

export type OAuth2AccessPolicyEvaluatorContext = {
    policyProvider: IOAuth2AccessPolicyProvider,
    identityPermissionProvider: IIdentityPermissionProvider,
    logger?: Logger,
};
