/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { aggregatePermissionPolicyBindings, buildPermissionKey } from '../helpers';
import type { PermissionPolicyBinding, PermissionPolicyBindingAggregated } from '../types';
import type { IPermissionProvider, PermissionGetOptions } from './types';

export class PermissionMemoryProvider implements IPermissionProvider {
    protected items : Record<string, PermissionPolicyBindingAggregated> = {};

    constructor(items: PermissionPolicyBinding[] = []) {
        this.setMany(items);
    }

    async findOne(
        options: PermissionGetOptions,
    ): Promise<PermissionPolicyBindingAggregated | null> {
        const key = buildPermissionKey({
            name: options.name,
            client_id: options.clientId,
            realm_id: options.realmId,
        });

        const entry = this.items[key];
        if (entry) {
            return entry;
        }

        return null;
    }

    setMany(input: PermissionPolicyBinding[]) {
        this.items = aggregatePermissionPolicyBindings(input)
            .reduce((prev, current) => {
                const key = buildPermissionKey(current.permission);
                prev[key] = current;
                return prev;
            }, {} as Record<string, PermissionPolicyBindingAggregated>);
    }
}
