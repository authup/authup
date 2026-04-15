/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */


import type { BasePermission } from '../types.ts';

function formatKeySegment(value?: string | null): string {
    return value || '*';
}

export function buildPermissionKey(
    input: BasePermission,
) {
    return `${formatKeySegment(input.realm_id)}/${formatKeySegment(input.client_id)}/${input.name}`;
}
