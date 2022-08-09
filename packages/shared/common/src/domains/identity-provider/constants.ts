/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum IdentityProviderType {
    LDAP = 'ldap',
    OAUTH2 = 'oauth2',
    OIDC = 'oidc',
}

export enum IdentityProviderFlow {
    DIRECT = 'direct',
    INDIRECT = 'indirect',
}
