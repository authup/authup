/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy } from '../policy';
import type { DecisionStrategy } from '@authup/kit';

export type BasePermission = {
    name: string;
    client_id?: string | null,
    realm_id?: string | null,
    decision_strategy?: `${DecisionStrategy}`
};

export type PermissionPolicyBinding = {
    permission: BasePermission,
    policies?: BasePolicy[],
};
