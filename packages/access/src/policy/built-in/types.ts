/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicy } from './attribute-names/index.ts';
import type { AttributesPolicy } from './attributes/index.ts';
import type { ClientMatchPolicy } from './client-match/index.ts';
import type { BuiltInPolicyType } from './constants.ts';
import type { DatePolicy } from './date/index.ts';
import type { CompositePolicy } from './composite/index.ts';
import type { IdentityPolicy } from './identity/index.ts';
import type { PermissionBindingPolicy } from './permission-binding/index.ts';
import type { RealmMatchPolicy } from './realm-match/index.ts';
import type { TimePolicy } from './time/index.ts';

type BuiltInPolicyTypeMapRaw<T extends Record<string, any> = Record<string, any>> = {
    [BuiltInPolicyType.ATTRIBUTES]: AttributesPolicy<T>,
    [BuiltInPolicyType.ATTRIBUTE_NAMES]: AttributeNamesPolicy,
    [BuiltInPolicyType.DATE]: DatePolicy,
    [BuiltInPolicyType.COMPOSITE]: CompositePolicy,
    [BuiltInPolicyType.TIME]: TimePolicy,
    [BuiltInPolicyType.IDENTITY]: IdentityPolicy,
    [BuiltInPolicyType.PERMISSION_BINDING]: PermissionBindingPolicy,
    [BuiltInPolicyType.REALM_MATCH]: RealmMatchPolicy,
    [BuiltInPolicyType.CLIENT_MATCH]: ClientMatchPolicy
};

export type BuiltInPolicyTypeMap<T extends Record<string, any> = Record<string, any>> = {
    [K in keyof BuiltInPolicyTypeMapRaw<T> as `${K}`]: BuiltInPolicyTypeMapRaw<T>[K];
};

export type BuiltInPolicies<T extends Record<string, any> = Record<string, any>> = {
    [K in keyof BuiltInPolicyTypeMap<T>]: BuiltInPolicyTypeMap<T>[K] & {
        type: K
    }
}[keyof BuiltInPolicyTypeMap];
