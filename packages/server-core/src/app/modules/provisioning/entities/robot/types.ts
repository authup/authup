/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Robot } from '@authup/core-kit';
import type { BaseProvisioningEntity } from '../types.ts';

export type RobotProvisioningRelations = {
    /**
     * Assign robot to realm permissions.
     */
    realmPermissions?: string[],

    /**
     * Assign robot to global permissions.
     */
    globalPermissions?: string[],

    // ------------------------------------------

    /**
     * Assign robot to roles of the same realm.
     */
    realmRoles?: string[]

    /**
     * Assign robot to global roles
     */
    globalRoles?: string[],
};

export type RobotProvisioningEntity = BaseProvisioningEntity<Robot> & {
    attributes: Partial<Robot>,

    relations?: RobotProvisioningRelations
};
