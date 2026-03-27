/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildPermissionBindingKey, mergePermissionBindings } from '../helpers';
import type { PermissionBinding } from '../types';
import type { IPermissionProvider, PermissionGetOptions } from './types';

export class PermissionMemoryProvider implements IPermissionProvider {
    protected items : Record<string, PermissionBinding> = {};

    constructor(items: PermissionBinding[] = []) {
        this.setMany(items);
    }

    async findOne(
        options: PermissionGetOptions,
    ): Promise<PermissionBinding | null> {
        const entry = this.items[buildPermissionBindingKey({
            name: options.name,
            client_id: options.clientId,
            realm_id: options.realmId,
        })];
        if (entry) {
            return entry;
        }

        return null;
    }

    setMany(input: PermissionBinding[]) {
        this.items = mergePermissionBindings(input)
            .reduce((prev, current) => {
                prev[buildPermissionBindingKey(current.permission)] = current;
                return prev;
            }, {} as Record<string, PermissionBinding>);
    }
}
