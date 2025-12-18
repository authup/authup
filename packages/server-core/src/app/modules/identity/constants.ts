/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const IdentityInjectionKey = {
    Resolver: Symbol('Resolver'),
    ProviderAccountManager: Symbol('AccountManager'),
    ProviderLdapCollectionAuthenticator: Symbol('ProviderLdapCollectionAuthenticator'),
} as const;
