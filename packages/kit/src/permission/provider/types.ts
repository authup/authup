/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionItem } from '../types';

export type PermissionGetOptions = {
    name: string,
    realmId?: string
};

export interface PermissionProvider {
    get(criteria: PermissionGetOptions) : Promise<PermissionItem | undefined>;
}
