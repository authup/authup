/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { User } from '@authup/core-kit';

export type UserProvisioningRelations = {
    /**
     * Assign user to specific client permissions of the same realm.
     */
    clientPermissions?: Record<string, string[]>,

    /**
     * Assign user to realm permissions.
     */
    realmPermissions?: string[],

    /**
     * Assign user to global permissions.
     */
    globalPermissions?: string[],

    // ------------------------------------------

    /**
     * Assign user to specific client roles of the same realm.
     */
    clientRoles?: Record<string, string[]>,

    /**
     * Assign user to roles of the same realm.
     */
    realmRoles?: string[]

    /**
     * Assign user to global roles
     */
    globalRoles?: string[],
};

export type UserProvisioningData = {
    attributes: Partial<User>,
    relations?: UserProvisioningRelations
};
