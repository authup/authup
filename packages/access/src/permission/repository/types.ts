/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionBinding } from '../types';

export type PermissionGetOptions = {
    name: string,
    client_id?: string | null,
    realm_id?: string | null
};

export interface IPermissionProvider {
    findOne(criteria: PermissionGetOptions) : Promise<PermissionBinding | null>;
}
