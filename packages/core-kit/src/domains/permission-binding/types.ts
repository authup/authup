/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '../permission';
import type { PolicyWithType } from '../policy';

export type PermissionBindingPermission =    Pick<Permission, 'name'> &
    Partial<Pick<Permission, 'client_id' | 'realm_id' | 'decision_strategy'>>;

export type PermissionBinding = {
    permission: PermissionBindingPermission,
    policies?: PolicyWithType[],
};
