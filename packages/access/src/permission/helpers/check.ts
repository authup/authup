/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy, isObject } from '@authup/kit';
import { RealmScope } from '../realm-scope';
import type { PermissionPolicyBinding } from '../types';

const DECISION_STRATEGIES : unknown[] = Object.values(DecisionStrategy);
const REALM_SCOPES : unknown[] = Object.values(RealmScope);

function isOptionalString(value: unknown) : boolean {
    return value === undefined || value === null || typeof value === 'string';
}

/**
 * Policies are checked shallowly: the policy type set is open, so a
 * policy's configuration is its validator's business, not the guard's.
 */
export function isPermissionPolicyBinding(value: unknown) : value is PermissionPolicyBinding {
    if (!isObject(value)) {
        return false;
    }

    const { permission } = value;

    if (
        !isObject(permission) ||
        typeof permission.name !== 'string' ||
        permission.name.length === 0 ||
        !isOptionalString(permission.realmId) ||
        !isOptionalString(permission.clientId)
    ) {
        return false;
    }

    if (
        permission.decisionStrategy !== undefined &&
        permission.decisionStrategy !== null &&
        !DECISION_STRATEGIES.includes(permission.decisionStrategy)
    ) {
        return false;
    }

    if (value.policies !== undefined) {
        if (!Array.isArray(value.policies)) {
            return false;
        }

        for (const policy of value.policies) {
            if (!isObject(policy) || typeof policy.type !== 'string') {
                return false;
            }
        }
    }

    return value.realmScope === undefined ||
        REALM_SCOPES.includes(value.realmScope);
}
