/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '../../constants';
import type { CompositePolicy, PolicyWithType } from '../../policy';
import { BuiltInPolicyType } from '../../policy';
import type { PermissionItem } from '../types';

/**
 * Merge one or more abilities together.
 * It will merge the policies to a composite policy.
 *
 * @param items
 */
export function mergePermissionItems(items: PermissionItem[]) : PermissionItem {
    if (items.length === 0) {
        throw new SyntaxError('At least one ability entry must be provided.');
    }

    if (items.length === 1) {
        return items[0];
    }

    const policy : PolicyWithType<CompositePolicy> = {
        type: BuiltInPolicyType.COMPOSITE,
        decisionStrategy: DecisionStrategy.AFFIRMATIVE,
        children: [],
    };

    for (let j = 0; j < items.length; j++) {
        const item = items[j];
        if (item.policy) {
            policy.children.push(item.policy);
        }
    }

    const entry : PermissionItem = {
        name: items[0].name,
    };

    if (typeof items[0].realm_id !== 'undefined') {
        entry.realm_id = items[0].realm_id;
    }

    if (policy.children.length > 0) {
        entry.policy = policy;
    }

    return entry;
}
