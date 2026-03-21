/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '../constants';
import type { PolicyWithType } from '../policy';

export type PermissionItem = {
    name: string,
    client_id?: string | null,
    realm_id?: string | null,
    policies?: PolicyWithType[],
    decision_strategy?: `${DecisionStrategy}`,
    /**
     * Single policy from a permission-binding junction (role-permission, user-permission, etc.).
     * Used by mergePermissionItems to combine junction-level policies.
     */
    policy?: PolicyWithType,
};
