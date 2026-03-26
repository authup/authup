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

    if ((a.permission.realmId ?? null) !== (b.permission.realmId ?? null)) {
        return false;
    }

    if ((a.permission.clientId ?? null) !== (b.permission.clientId ?? null)) {
        return false;
    }

    return true;
}
