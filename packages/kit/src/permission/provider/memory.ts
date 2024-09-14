/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mergePermissionItems } from '../helpers';
import type { PermissionItem } from '../types';
import type { PermissionGetOptions, PermissionProvider } from './types';

export class PermissionMemoryProvider implements PermissionProvider {
    protected items : Record<string, PermissionItem> = {};

    constructor(items: PermissionItem[] = []) {
        this.setMany(items);
    }

    async get(
        options: PermissionGetOptions,
    ): Promise<PermissionItem | undefined> {
        return this.items[`${options.realmId || '/'}:${options.name}`];
    }

    setMany(input: PermissionItem[]) {
        this.items = mergePermissionItems(input)
            .reduce((prev, current) => {
                prev[`${current.realm_id || '/'}:${current.name}`] = current;
                return prev;
            }, {} as Record<string, PermissionItem>);
    }
}
