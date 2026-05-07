/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';

// Mirrors `RoleValidator` mounts in @authup/core-kit.
export type RoleCreatePayload =    & Pick<Role, 'name'> &
    Partial<Pick<Role, 'display_name' | 'description' | 'client_id' | 'realm_id'>>;
export type RoleUpdatePayload = Partial<RoleCreatePayload>;
export type RoleSavePayload = RoleCreatePayload;
