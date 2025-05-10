/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProvider, LdapIdentityProvider, OAuth2IdentityProviderBase, User,
} from '@authup/core-kit';
import type { AuthorizeParameters } from '@hapic/oauth2';
import type { Request } from 'routup';

export type IdentityProviderIdentityStatus = 'created' | 'updated';
export type IdentityProviderIdentity = {
    id: string,
    /**
     * Required for ldap authentication.
     */
    roles?: string[],
    /**
     * Attribute candidates discovered during
     * authentication step (ldap, oauth2, ...).
     */
    attributeCandidates?: {
        [K in keyof User]?: unknown[]
    },
    data: Record<string, any>
    status?: IdentityProviderIdentityStatus,
};

export type LdapIdentityProviderFlowOptions = Omit<LdapIdentityProvider, keyof IdentityProvider>;
export interface ILdapIdentityProviderFlow {
    getIdentity(user: string, password: string) : Promise<IdentityProviderIdentity>;
}

export type OAuth2IdentityProviderFlowOptions = IdentityProvider & Partial<OAuth2IdentityProviderBase>;

export interface IOAuth2IdentityProviderFlow {
    buildRedirectURL(parameters?: Partial<AuthorizeParameters>) : string;
    getIdentityForRequest(request: Request) : Promise<IdentityProviderIdentity>;
}
