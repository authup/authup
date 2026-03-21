/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '../permission';
import type { Policy } from '../policy';

export interface PermissionPolicy {
    id: string;

    permission_id: Permission['id'];
    permission: Permission;

    policy_id: Policy['id'];
    policy: Policy;

    created_at: string;
    updated_at: string;
}
