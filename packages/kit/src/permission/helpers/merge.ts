/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '../../constants';
import type { CompositePolicy, PolicyWithType } from '../../policy';
import { BuiltInPolicyType } from '../../policy';
import type { PermissionItem } from '../types';

export function mergePermissionItems(input: PermissionItem[]) : PermissionItem[] {
    const grouped : Record<string, PermissionItem[]> = input
        .reduce((previous, current) => {
            const key = current.realm_id || `/${current.name}`;
            if (!previous[key]) {
                previous[key] = [];
            }

            previous[key].push(current);

            return previous;
        }, {} as Record<string, PermissionItem[]>);

    const output : PermissionItem[] = [];
    const keys = Object.keys(grouped);
    for (let i = 0; i < keys.length; i++) {
        const [permission, ...permissions] = grouped[keys[i]];

        if (permissions.length > 0) {
            const policy: PolicyWithType<CompositePolicy> = {
                type: BuiltInPolicyType.COMPOSITE,
                decisionStrategy: DecisionStrategy.AFFIRMATIVE,
                children: permissions
                    .map((el) => el.policy)
                    .filter((el) => typeof el !== 'undefined'),
            };

            if (permission.policy) {
                policy.children.push(permission.policy);
            }

            if (policy.children.length > 0) {
                permission.policy = policy;
            }
        }

        output.push(permission);
    }

    return output;
}
