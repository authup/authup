/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildPermissionKey, mergePermissionPolicyBindings } from '../helpers';
import type { PermissionPolicyBinding } from '../types';
import type { IPermissionProvider, PermissionGetOptions } from './types';

export class PermissionMemoryProvider implements IPermissionProvider {
    protected items : Record<string, PermissionPolicyBinding> = {};

    constructor(items: PermissionPolicyBinding[] = []) {
        this.setMany(items);
    }

    async findOne(
        options: PermissionGetOptions,
    ): Promise<PermissionPolicyBinding | null> {
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
        this.items = mergePermissionPolicyBindings(input)
            .reduce((prev, current) => {
                const key = buildPermissionKey(current.permission);
                prev[key] = current;
                return prev;
            }, {} as Record<string, PermissionPolicyBinding>);
    }
}
