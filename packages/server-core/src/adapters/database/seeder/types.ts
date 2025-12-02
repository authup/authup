/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot, User } from '@authup/core-kit';

export type DatabaseRootSeederResult = {
    robot?: Robot,
    user?: User
};
export type DatabaseSeederOptions = {
    /**
     * default: true
     */
    userAdminEnabled: boolean,
    /**
     * default: 'admin'
     */
    userAdminName: string,
    /**
     * default: 'start123'
     */
    userAdminPassword: string,
    /**
     * default: undefined
     */
    userAdminPasswordReset?: boolean,

    // ----------------------------------------------------

    /**
     * default: false
     */
    robotAdminEnabled: boolean,
    /**
     * default: system
     */
    robotAdminName?: string,
    /**
     * default: undefined
     */
    robotAdminSecret?: string,
    /**
     * default: undefined
     */
    robotAdminSecretReset?: boolean,

    // ----------------------------------------------------

    /**
     * default: []
     */
    permissions: string | string[],
};
