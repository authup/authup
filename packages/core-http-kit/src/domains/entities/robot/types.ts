/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityRecordResponse, IEntityAPI } from '../../types-base';

import type { Robot } from '@authup/core-kit';

// Mirrors `RobotValidator` mounts in @authup/core-kit.
export type RobotCreatePayload = Pick<Robot, 'name'> &
    Partial<Pick<Robot, 'secret' |
        'active' |
        'displayName' |
        'description' |
        'userId' |
        'realmId'>>;
export type RobotUpdatePayload = Partial<RobotCreatePayload>;
export type RobotSavePayload = RobotCreatePayload;

export interface IRobotAPI extends IEntityAPI<Robot, RobotCreatePayload, RobotUpdatePayload> {
    createOrUpdate(idOrName: string, data: RobotSavePayload) : Promise<EntityRecordResponse<Robot>>;
    integrity(id: Robot['id'] | Robot['name']) : Promise<EntityRecordResponse<Robot>>;
}
