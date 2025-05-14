/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum ScopeName {
    /**
     * Full permissions
     */
    GLOBAL = 'global',

    /**
     * for Openid usage (id-token)
     */
    OPEN_ID = 'openid',

    /**
     * /users/@me with email (userinfo & id-token)
     */
    EMAIL = 'email',

    /**
     * Roles array (id-token)
     */
    ROLES = 'roles',

    /**
     * /users/@me without email (userinfo & id-token)
     */
    IDENTITY = 'identity',
}
