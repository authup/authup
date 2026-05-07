/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '@authup/core-kit';

// Mirrors `RobotValidator` mounts in @authup/core-kit.
export type RobotCreatePayload =    & Pick<Robot, 'name'> &
    Partial<Pick<Robot, 'secret' |
        'active' |
        'display_name' |
        'description' |
        'user_id' |
        'realm_id'>>;
export type RobotUpdatePayload = Partial<RobotCreatePayload>;
export type RobotSavePayload = RobotCreatePayload;
