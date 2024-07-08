/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionItem } from '../types';
import type { PermissionRepository } from './types';

export class PermissionMemoryRepository implements PermissionRepository {
    protected items : PermissionItem[];

    constructor(items: PermissionItem[] = []) {
        this.items = items;
    }

    async getMany(name: string): Promise<PermissionItem[]> {
        return this.items.filter((item) => item.name === name);
    }

    setMany(items: PermissionItem[]) {
        this.items = items;
    }
}
