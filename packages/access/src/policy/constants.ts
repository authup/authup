/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AttributeNamesPolicyEvaluator,
    AttributesPolicyEvaluator,
    BuiltInPolicyType,
    CompositePolicyEvaluator,
    DatePolicyEvaluator,
    IdentityPolicyEvaluator,
    PermissionBindingPolicyEvaluator,
    RealmMatchPolicyEvaluator,
    TimePolicyEvaluator,
} from './built-in';

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
