/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicy } from './attribute-names';
import type { AttributesPolicy } from './attributes';
import type { BuiltInPolicyType } from './constants';
import type { DatePolicy } from './date';
import type { CompositePolicy } from './composite';
import type { IdentityPolicy } from './identity';
import type { PermissionBindingPolicy } from './permission-binding';
import type { TimePolicy } from './time';

type BuiltInPolicyTypeMapRaw<T extends Record<string, any> = Record<string, any>> = {
    [BuiltInPolicyType.ATTRIBUTES]: AttributesPolicy<T>,
    [BuiltInPolicyType.ATTRIBUTE_NAMES]: AttributeNamesPolicy,
    [BuiltInPolicyType.DATE]: DatePolicy,
    [BuiltInPolicyType.COMPOSITE]: CompositePolicy,
    [BuiltInPolicyType.TIME]: TimePolicy,
    [BuiltInPolicyType.IDENTITY]: IdentityPolicy,
    [BuiltInPolicyType.PERMISSION_BINDING]: PermissionBindingPolicy
};

export type BuiltInPolicyTypeMap<T extends Record<string, any> = Record<string, any>> = {
    [K in keyof BuiltInPolicyTypeMapRaw<T> as `${K}`]: BuiltInPolicyTypeMapRaw<T>[K];
};

export type BuiltInPolicies<T extends Record<string, any> = Record<string, any>> = {
    [K in keyof BuiltInPolicyTypeMap<T>]: BuiltInPolicyTypeMap<T>[K] & {
        type: K
    }
}[keyof BuiltInPolicyTypeMap];
