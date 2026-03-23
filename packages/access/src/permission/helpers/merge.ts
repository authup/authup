/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '../../constants';
import type { CompositePolicy, PolicyWithType } from '../../policy';
import { BuiltInPolicyType } from '../../policy';
import type { PermissionBinding } from '../types';
import { buildPermissionBindingKey } from './key';

export function mergePermissionBindings(input: PermissionBinding[]) : PermissionBinding[] {
    const grouped : Record<string, PermissionBinding[]> = input
        .reduce((previous, current) => {
            const key = buildPermissionBindingKey(current.permission);
            if (!previous[key]) {
                previous[key] = [];
            }

            previous[key].push(current);

            return previous;
        }, {} as Record<string, PermissionBinding[]>);

    const output : PermissionBinding[] = [];
    const keys = Object.keys(grouped);
    for (const key of keys) {
        const group = grouped[key];
        const [first] = group;

        if (group.length === 1) {
            output.push(first);
            continue;
        }

        const children : PolicyWithType[] = [];

        for (const element of group) {
            if (!element.policies || element.policies.length === 0) {
                continue;
            }

            const policy: PolicyWithType<CompositePolicy> = {
                type: BuiltInPolicyType.COMPOSITE,
                decision_strategy: element.permission.decision_strategy || DecisionStrategy.UNANIMOUS,
                children: element.policies,
            };

            children.push(policy);
        }

        let mergedPolicies: PolicyWithType[] | undefined;

        if (
            children.length > 0 &&
            children.length === group.length
        ) {
            const policy: PolicyWithType<CompositePolicy> = {
                type: BuiltInPolicyType.COMPOSITE,
                decision_strategy: DecisionStrategy.AFFIRMATIVE,
                children,
            };

            mergedPolicies = [policy];
        }

        output.push({
            permission: {
                ...first.permission,
                decision_strategy: DecisionStrategy.AFFIRMATIVE,
            },
            policies: mergedPolicies,
        });
    }

    return output;
}
