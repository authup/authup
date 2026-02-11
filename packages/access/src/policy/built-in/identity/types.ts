/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyBase } from '../../types';

export interface IdentityPolicy extends PolicyBase {
    /**
     * Set of allowed identity types.
     */
    types?: string[],
}

export type IdentityPolicyData = {
    /**
     * user, client, robot
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
    realmName?: string | null
};
