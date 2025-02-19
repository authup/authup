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

    if (typeof a.realmId === 'string' || typeof b.realmId === 'string') {
        return a.realmId === b.realmId;
    }

    if (typeof a.clientId === 'string' || typeof b.clientId === 'string') {
        return a.clientId === b.clientId;
    }

    return !!a.realmId === !!b.realmId && !!a.clientId === !!b.clientId;
}
