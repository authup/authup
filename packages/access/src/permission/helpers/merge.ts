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
        const [binding, ...bindings] = grouped[key];

        if (bindings.length > 0) {
            const allBindings = [binding, ...bindings];
            const hasUnrestricted = allBindings.some((el) => !el.policies || el.policies.length === 0);

            if (hasUnrestricted) {
                binding.policies = undefined;
            } else {
                const children = allBindings
                    .flatMap((el) => el.policies || []);

                if (children.length > 0) {
                    const policy: PolicyWithType<CompositePolicy> = {
                        type: BuiltInPolicyType.COMPOSITE,
                        decision_strategy: DecisionStrategy.AFFIRMATIVE,
                        children,
                    };

                    binding.policies = [policy];
                }
            }
        }

        output.push(binding);
    }

    return output;
}
