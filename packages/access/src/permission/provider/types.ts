/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionItem } from '../types';

export type PermissionGetOptions = {
    name: string,
    clientId?: string | null,
    realmId?: string | null
};

export interface IPermissionProvider {
    get(criteria: PermissionGetOptions) : Promise<PermissionItem | undefined>;
}
