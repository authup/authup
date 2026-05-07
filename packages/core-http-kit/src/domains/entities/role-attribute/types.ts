/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RoleAttribute } from '@authup/core-kit';

// `RoleAttribute` has no dedicated validator class — `RoleAttributeService` validates
// inline and accepts `name`, `value`, and `role_id` (or a populated `role` relation).
export type RoleAttributeCreatePayload =    & Pick<RoleAttribute, 'name'> &
    Partial<Pick<RoleAttribute, 'value' | 'role_id'>>;
export type RoleAttributeUpdatePayload = Partial<RoleAttributeCreatePayload>;
export type RoleAttributeSavePayload = RoleAttributeCreatePayload;
