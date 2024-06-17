/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum IdentityProviderProtocol {
    LDAP = 'ldap',
    OAUTH2 = 'oauth2',
    OIDC = 'oidc',
}

export enum IdentityProviderMappingSyncMode {
    /**
     * Synchronize on initial user login.
     */
    ONCE = 'once',
    /**
     * Synchronize on every user login.
     */
    ALWAYS = 'always',
    /**
     * Synchronize based on idp configuration.
     */
    INHERIT = 'inherit',
}
