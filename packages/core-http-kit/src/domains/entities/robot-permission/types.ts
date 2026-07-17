/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntityAPI } from '../../types-base';

import type { RobotPermission } from '@authup/core-kit';

// Mirrors `RobotPermissionValidator` mounts in @authup/core-kit.
export type RobotPermissionCreatePayload = Pick<RobotPermission, 'robotId' | 'permissionId'> &
    Partial<Pick<RobotPermission, 'policyId' | 'realmScope'>>;
export type RobotPermissionUpdatePayload = Partial<RobotPermissionCreatePayload>;

export interface IRobotPermissionAPI extends IEntityAPI<RobotPermission, RobotPermissionCreatePayload, RobotPermissionUpdatePayload> {}
