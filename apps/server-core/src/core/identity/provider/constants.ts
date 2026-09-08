/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum IdentityProviderIdentityOperation {
    CREATE = 'create',
    UPDATE = 'update',
}

/**
 * The attribute names that carry a secret authup presents to the provider:
 * the OAuth2/OIDC client secret and the LDAP bind password. The repository
 * adapter encrypts exactly these at rest under the provider realm's
 * encryption key (plan 070 Stage 2); every other attribute is stored as
 * written.
 */
export const IDENTITY_PROVIDER_SECRET_ATTRIBUTES = ['clientSecret', 'password'] as const;
