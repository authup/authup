/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEngine, PolicyWithType } from '../policy';
import type { PermissionProvider } from './provider';

export type PermissionItem = {
    name: string,
    realm_id?: string | null,
    policy?: PolicyWithType,
};

export type PermissionCheckerOptions = {
    provider?: PermissionProvider,
    policyEngine?: PolicyEngine,
    realmId?: string
};
