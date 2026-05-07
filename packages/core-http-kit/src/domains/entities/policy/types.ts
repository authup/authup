/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuiltInPolicies } from '@authup/access';
import type { Policy } from '@authup/core-kit';

export type PolicyAPICheckResponse = {
    status: 'success' | 'error',
    data?: Record<string, any>
};

export type PolicyResponse = Policy & Record<string, any>;

export type BuiltInPolicyResponse<
    T extends Record<string, any> = Record<string, any>,
> = Omit<Policy, 'type'> & BuiltInPolicies<T>;

// Mirrors `PolicyValidator` mounts in @authup/core-kit. Policies carry dynamic per-type
// attributes loaded as extra-attributes; the `& Record<string, any>` keeps those open.
type PolicyValidatedFields =    & Pick<Policy, 'name' | 'type'> &
    Partial<Pick<Policy, 'display_name' | 'invert' | 'realm_id'>> &
    { parent_id?: string | null };
export type PolicyCreatePayload = PolicyValidatedFields & Record<string, any>;
export type PolicyUpdatePayload = Partial<PolicyValidatedFields> & Record<string, any>;
export type PolicySavePayload = PolicyCreatePayload;

export type BuiltInPolicyCreatePayload<
    T extends Record<string, any> = Record<string, any>,
> = Omit<PolicyValidatedFields, 'type'> & BuiltInPolicies<T>;
export type BuiltInPolicyUpdatePayload<
    T extends Record<string, any> = Record<string, any>,
> = Partial<Omit<PolicyValidatedFields, 'type'>> & BuiltInPolicies<T>;
