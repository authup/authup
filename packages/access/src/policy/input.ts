/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuiltInPolicyType } from './built-in/constants';
import type { IdentityPolicyData } from './built-in/identity/types';
import { PolicyData } from './data';

/**
 * Typed seed for a permission evaluation's {@link PolicyData} bag.
 *
 * The well-known context keys are value-typed, so construction is discoverable and a
 * wrong-typed value is a compile error. The trailing index signature keeps the bag **open** —
 * a third-party evaluator may supply its own key without any change to this published type
 * (the `access` evaluator set is deliberately extensible).
 */
export interface PolicyInput {
    [BuiltInPolicyType.IDENTITY]?: IdentityPolicyData;
    [BuiltInPolicyType.ATTRIBUTES]?: Record<string, any>;
    [BuiltInPolicyType.REALM_MATCH]?: string | string[] | null;
    [key: string]: any;
}

/**
 * Build a {@link PolicyData} bag from a typed {@link PolicyInput} seed. Well-known keys
 * (identity / attributes / realmMatch) are type-checked; unknown keys are accepted as-is.
 *
 * Prefer this over `new PolicyData({ ... })` at construction sites so the key vocabulary and
 * per-key value types live in one place.
 */
export function definePolicyData(input: PolicyInput = {}): PolicyData {
    return new PolicyData(input);
}
