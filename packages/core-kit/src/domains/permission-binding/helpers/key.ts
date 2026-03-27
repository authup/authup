/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionBindingPermission } from '../types';

function formatKeySegment(value?: string | null): string {
    if (typeof value === 'undefined') {
        return '*';
    }

    return value || '_';
}

export function buildPermissionBindingKey(
    input: PermissionBindingPermission,
) {
    return `${formatKeySegment(input.realm_id)}/${formatKeySegment(input.client_id)}/${input.name}`;
}
