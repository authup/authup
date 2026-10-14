/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicyBinding } from '../../../permission/types';
import type { BasePolicy } from '../../types';

export interface IdentityPolicy extends BasePolicy {
    /**
     * Set of allowed identity types.
     */
    types?: string[],
}

export type IdentityPolicyData = {
    /**
     * user, client
     */
    type: string,
    /**
     * UUID
     */
    id: string,
    /**
     * Client associated with identity.
     */
    clientId?: string | null,
    /**
     * Realm id associated with identity.
     */
    realmId?: string | null,
    /**
     * Realm name associated with identity.
     */
    realmName?: string | null,
    /**
     * The grants the identity holds. The permission binding evaluator reads
     * them from here rather than loading them, so evaluation is a function of
     * the data alone. Whoever places an identity in the policy data places
     * its grants with it, and an identity without them holds none we could
     * prove.
     */
    grants?: PermissionPolicyBinding[]
};
