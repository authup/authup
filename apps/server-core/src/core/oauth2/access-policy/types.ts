/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy, IdentityPolicyData } from '@authup/access';
import type { Logger } from '@authup/server-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';

export interface IOAuth2AccessPolicyEvaluator {
    /**
     * true = access permitted. A present-but-unresolvable policy id,
     * a load failure, or an evaluation failure all yield false (fail closed).
     */
    evaluate(policyId: string, subject: IdentityPolicyData): Promise<boolean>;
}

export interface IOAuth2AccessPolicyProvider {
    findDescendantsTreeById(id: string): Promise<BasePolicy | null>;
}

export type OAuth2AccessPolicyEvaluatorContext = {
    policyProvider: IOAuth2AccessPolicyProvider,
    identityPermissionProvider: IIdentityPermissionProvider,
    logger?: Logger,
};
