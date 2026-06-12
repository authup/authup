/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntityAPI } from '../../types-base';

import type { UserAttribute } from '@authup/core-kit';

// `UserAttribute` has no dedicated validator class — `UserAttributeService` validates
// inline and accepts `name`, `value`, and `user_id` (defaulted to the actor on self-edit).
export type UserAttributeCreatePayload = Pick<UserAttribute, 'name'> &
    Partial<Pick<UserAttribute, 'value' | 'user_id'>>;
export type UserAttributeUpdatePayload = Partial<UserAttributeCreatePayload>;
export type UserAttributeSavePayload = UserAttributeCreatePayload;

export interface IUserAttributeAPI extends IEntityAPI<UserAttribute, UserAttributeCreatePayload, UserAttributeUpdatePayload> {}
