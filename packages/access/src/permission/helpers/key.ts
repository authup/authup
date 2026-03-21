/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionItem } from '../types';

export function buildPermissionItemKey(input: PermissionItem) {
    return `${input.realm_id || '_'}/${input.client_id || '_'}/${input.name}`;
}
