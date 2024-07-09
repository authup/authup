/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionItem } from '../types';

export type PermissionFindOneOptions = {
    name: string,
    realm_id?: string
};

export type PermissionFindManyOptions = {
    names: string[],
    realm_id?: string
};

export interface PermissionRepository {
    findOne(options: PermissionFindOneOptions) : Promise<PermissionItem | undefined>;
    findMany(options: PermissionFindManyOptions): Promise<PermissionItem[]>;
}
