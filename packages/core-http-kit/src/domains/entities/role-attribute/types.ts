/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RoleAttribute } from '@authup/core-kit';

// `RoleAttribute` has no dedicated validator class — `RoleAttributeService` validates
// inline. `role_id` is required at runtime: the service sets
// `data.realm_id = data.role.realm_id` after `validateJoinColumns` populates `data.role`
// from the `role_id` FK, so omitting `role_id` causes a TypeError.
export type RoleAttributeCreatePayload = Pick<RoleAttribute, 'name' | 'role_id'> &
    Partial<Pick<RoleAttribute, 'value'>>;
export type RoleAttributeUpdatePayload = Partial<RoleAttributeCreatePayload>;
export type RoleAttributeSavePayload = RoleAttributeCreatePayload;
