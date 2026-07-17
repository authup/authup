/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntityAPISlim } from '../../types-base';

import type { UserRole } from '@authup/core-kit';

// Mirrors `UserRoleValidator` mounts in @authup/core-kit.
export type UserRoleCreatePayload = Pick<UserRole, 'userId' | 'roleId'>;

export interface IUserRoleAPI extends IEntityAPISlim<UserRole, UserRoleCreatePayload> {}
