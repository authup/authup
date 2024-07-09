/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionItem } from '../types';
import type { PermissionFindManyOptions, PermissionFindOneOptions, PermissionRepository } from './types';

export class PermissionMemoryRepository implements PermissionRepository {
    protected items : PermissionItem[];

    constructor(items: PermissionItem[] = []) {
        this.items = items;
    }

    async findOne(options: PermissionFindOneOptions): Promise<PermissionItem | undefined> {
        const items = await this.findMany({
            ...options,
            names: [options.name],
        });

        if (items.length > 0) {
            return items[0];
        }

        return undefined;
    }

    async findMany(options: PermissionFindManyOptions): Promise<PermissionItem[]> {
        return this.items.filter((item) => {
            if (options.names.indexOf(item.name) === -1) {
                return false;
            }

            if (options.realm_id) {
                if (options.realm_id !== item.realm_id) {
                    return false;
                }
            } else if (item.realm_id) {
                return false;
            }

            return true;
        });
    }

    setMany(items: PermissionItem[]) {
        this.items = items;
    }
}
