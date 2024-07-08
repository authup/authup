/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnyPolicy, PolicyEngine } from '../policy';
import type { PermissionRepository } from './repository';

// todo: move this to store.
export type PermissionItem = {
    name: string,
    realm_id?: string | null,
    policy?: AnyPolicy,
};

export type PermissionManagerOptions = {
    policyEngine?: PolicyEngine,
    repository?: PermissionRepository
};
