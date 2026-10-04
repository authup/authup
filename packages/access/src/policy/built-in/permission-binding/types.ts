/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicyBinding } from '../../../permission/types';
import type { BasePolicy } from '../../types';

export interface PermissionBindingPolicy extends BasePolicy {

}

/**
 * The grants an identity holds, as placed in the policy data under
 * `PolicyDataKey.GRANTS`. They name the subject they belong to, so grants left
 * next to an identity they were not loaded for are refused instead of
 * evaluated.
 */
export type IdentityGrants = {
    identity: {
        type: string,
        id: string,
    },
    bindings: PermissionPolicyBinding[],
};
