/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, LdapIdentityProvider, OAuth2IdentityProviderBase } from '@authup/core-kit';
import type { JWTClaims } from '@authup/security';
import type { Request } from 'routup';

export type IdentityProviderIdentityStatus = 'created' | 'updated';
export type IdentityProviderIdentity = {
    id: string,
    name: string | string[],
    email?: string | string[],
    roles?: string[],
    first_name?: string,
    last_name?: string,
    data: JWTClaims,
    status?: IdentityProviderIdentityStatus,
};

export type LdapIdentityProviderFlowOptions = Omit<LdapIdentityProvider, keyof IdentityProvider>;
export interface ILdapIdentityProviderFlow {
    getIdentity(user: string, password: string) : Promise<IdentityProviderIdentity>;
}

export type OAuth2IdentityProviderFlowOptions = IdentityProvider & Partial<OAuth2IdentityProviderBase>;

export interface IOAuth2IdentityProviderFlow {
    buildAuthorizeURL() : string;
    getIdentityForRequest(request: Request) : Promise<IdentityProviderIdentity>;
}
