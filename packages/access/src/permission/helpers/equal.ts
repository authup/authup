/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePermission } from '../types';

export function isPermissionPolicyBindingEqual(
    a: { permission: BasePermission },
    b: { permission: BasePermission },
): boolean {
    return a.permission.name === b.permission.name &&
        (a.permission.realmId ?? null) === (b.permission.realmId ?? null) &&
        (a.permission.clientId ?? null) === (b.permission.clientId ?? null);
}
