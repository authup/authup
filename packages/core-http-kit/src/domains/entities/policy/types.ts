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

type PolicyCreateSubset = Pick<Policy, 'name'> & Partial<Pick<Policy, 'display_name' | 'description' | 'invert'>>;
export type PolicyCreateRequest = PolicyCreateSubset & Record<string, any>;

export type BuiltInPolicyCreateRequest<
    T extends Record<string, any> = Record<string, any>,
> = PolicyCreateSubset & BuiltInPolicies<T>;

type PolicyUpdateSubset = Partial<PolicyCreateSubset>;

export type PolicyUpdateRequest = PolicyUpdateSubset & Record<string, any>;
export type BuiltInPolicyUpdateRequest<
    T extends Record<string, any> = Record<string, any>,
> = PolicyUpdateSubset & BuiltInPolicies<T>;
