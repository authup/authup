/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionItem } from '../types';

export function isPermissionItemEqual(a: PermissionItem, b: PermissionItem): boolean {
    if (a.name !== b.name) {
        return false;
    }

    if (typeof a.realm_id === 'string' || typeof b.realm_id === 'string') {
        return a.realm_id === b.realm_id;
    }

    return !!a.realm_id === !!b.realm_id;
}
