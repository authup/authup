/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionBinding } from '../types';

export function isPermissionBindingEqual(a: PermissionBinding, b: PermissionBinding): boolean {
    if (a.permission.name !== b.permission.name) {
        return false;
    }

    if ((a.permission.realm_id ?? null) !== (b.permission.realm_id ?? null)) {
        return false;
    }

    if ((a.permission.client_id ?? null) !== (b.permission.client_id ?? null)) {
        return false;
    }

    return true;
}
