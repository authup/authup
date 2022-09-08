/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type DatabaseOptions = {
    /**
     * default: 'admin'
     */
    adminUsername: string,

    /**
     * default: 'start123'
     */
    adminPassword: string,

    /**
     * default: undefined
     */
    adminPasswordReset?: boolean,

    /**
     * default: false
     */
    robotEnabled: boolean,

    /**
     * default: undefined
     */
    robotSecret?: string,

    /**
     * default: undefined
     */
    robotSecretReset?: boolean,

    /**
     * default: []
     */
    permissions: string[],
};
