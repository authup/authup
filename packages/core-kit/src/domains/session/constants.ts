/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * How a session's subject authenticated. Recorded on the session at
 * creation time; drives the id_token amr/acr derivation.
 */
export enum SessionAuthMethod {
    /**
     * Local password grant.
     */
    PASSWORD = 'pwd',

    /**
     * LDAP-collection-backed password grant.
     */
    LDAP = 'ldap',

    /**
     * Federated OAuth2/OIDC identity-provider callback.
     */
    EXTERNAL = 'ext',

    /**
     * client_credentials grant (M2M — no id_token).
     */
    CLIENT = 'client',

    /**
     * robot_credentials grant (M2M — no id_token).
     */
    ROBOT = 'robot',
}
