/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AttributeNamesPolicyEvaluator,
    AttributeNamesPolicyValidator,
    AttributesPolicyEvaluator,
    AttributesPolicyValidator,
    BuiltInPolicyType,
    CompositePolicyEvaluator,
    CompositePolicyValidator,
    DatePolicyEvaluator,
    DatePolicyValidator,
    IdentityPolicyEvaluator,
    IdentityPolicyValidator,
    PermissionBindingPolicyEvaluator,
    PermissionBindingPolicyValidator,
    RealmMatchPolicyEvaluator,
    RealmMatchPolicyValidator,
    TimePolicyEvaluator,
    TimePolicyValidator,
} from './built-in';
import type { PolicyValidators } from './types.ts';

export const PolicyDefaultEvaluators = {
    [BuiltInPolicyType.COMPOSITE]: new CompositePolicyEvaluator(),
    [BuiltInPolicyType.ATTRIBUTES]: new AttributesPolicyEvaluator(),
    [BuiltInPolicyType.ATTRIBUTE_NAMES]: new AttributeNamesPolicyEvaluator(),
    [BuiltInPolicyType.DATE]: new DatePolicyEvaluator(),
    [BuiltInPolicyType.IDENTITY]: new IdentityPolicyEvaluator(),
    [BuiltInPolicyType.PERMISSION_BINDING]: new PermissionBindingPolicyEvaluator(),
    [BuiltInPolicyType.REALM_MATCH]: new RealmMatchPolicyEvaluator(),
    [BuiltInPolicyType.TIME]: new TimePolicyEvaluator(),
} as const;

/**
 * The configuration validator of every built-in policy type, keyed like
 * `PolicyDefaultEvaluators`. It is what `projectAuthorizationPolicy` runs a
 * node through, so a type absent here cannot travel in the authorization
 * catalog. The registry is open like the evaluator one (#3635): spread it and
 * add a custom type's validator to let that type travel. It is frozen, since
 * a write into it would make the type projectable for every caller in the
 * process.
 */
export const PolicyDefaultValidators : Readonly<PolicyValidators> = Object.freeze({
    [BuiltInPolicyType.COMPOSITE]: new CompositePolicyValidator(),
    [BuiltInPolicyType.ATTRIBUTES]: new AttributesPolicyValidator(),
    [BuiltInPolicyType.ATTRIBUTE_NAMES]: new AttributeNamesPolicyValidator(),
    [BuiltInPolicyType.DATE]: new DatePolicyValidator(),
    [BuiltInPolicyType.IDENTITY]: new IdentityPolicyValidator(),
    [BuiltInPolicyType.PERMISSION_BINDING]: new PermissionBindingPolicyValidator(),
    [BuiltInPolicyType.REALM_MATCH]: new RealmMatchPolicyValidator(),
    [BuiltInPolicyType.TIME]: new TimePolicyValidator(),
});
