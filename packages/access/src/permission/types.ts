/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy } from '../policy';
import type { DecisionStrategy } from '@authup/kit';
import type { RealmScopeValue } from './realm-scope.ts';

export type BasePermission = {
    name: string;
    client_id?: string | null,
    realm_id?: string | null,
    decision_strategy?: `${DecisionStrategy}` | null
};

export type PermissionPolicyBinding = {
    permission: BasePermission,
    policies?: BasePolicy[],
    /**
     * Relative realm reach of this grant (none/own/own_or_null/any). Merged across
     * grants by ordered-MAX; absent coerces to the most restrictive `own` (fail-closed).
     * NOT part of the binding identity key (see isPermissionPolicyBindingEqual).
     */
    realm_scope?: RealmScopeValue,
    /**
     * Absolute realm allowlist (concrete realm ids) ORed with `realm_scope`. Merged
     * across grants by union. null/global is expressed via `own_or_null`, never here.
     */
    realm_ids?: string[] | null,
};
