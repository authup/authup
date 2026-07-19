/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2JsonWebKey, OpenIDProviderMetadata } from '@authup/specs';
import type { ClientOptionsInput, IClient as IBaseClient } from 'hapic';
import type {
    IClientAPI,
    IClientPermissionAPI,
    IClientRoleAPI,
    IClientScopeAPI,
    IConsentAPI,
    IEventAPI,
    IIdentityProviderAPI,
    IIdentityProviderRoleMappingAPI,
    IKeyAPI,
    IOAuth2AuthorizeAPI,
    IOAuth2TokenAPI,
    IOAuth2UserInfoAPI,
    IPermissionAPI,
    IPermissionPolicyAPI,
    IPolicyAPI,
    IRealmAPI,
    IRoleAPI,
    IRoleAttributeAPI,
    IRolePermissionAPI,
    IScopeAPI,
    ISessionAPI,
    IStatusAPI,
    ITrustAnchorAPI,
    IUserAPI,
    IUserAttributeAPI,
    IUserAuthenticatorAPI,
    IUserPermissionAPI,
    IUserRoleAPI,
} from '../domains';

export type ClientOptions = ClientOptionsInput;

/**
 * Replaceable contract of the authup HTTP client: the base transport
 * surface plus every sub-API behind its interface. Implemented by
 * `Client`; any test double satisfying it can substitute.
 */
export interface IClient extends IBaseClient {
    readonly authorize : IOAuth2AuthorizeAPI;

    readonly client : IClientAPI;

    readonly clientPermission : IClientPermissionAPI;

    readonly clientRole : IClientRoleAPI;

    readonly clientScope : IClientScopeAPI;

    readonly consent : IConsentAPI;

    readonly event : IEventAPI;

    readonly identityProvider : IIdentityProviderAPI;

    readonly identityProviderRoleMapping : IIdentityProviderRoleMappingAPI;

    readonly key : IKeyAPI;

    readonly permission : IPermissionAPI;

    readonly permissionPolicy : IPermissionPolicyAPI;

    readonly policy : IPolicyAPI;

    readonly realm : IRealmAPI;

    readonly role : IRoleAPI;

    readonly roleAttribute : IRoleAttributeAPI;

    readonly rolePermission : IRolePermissionAPI;

    readonly scope : IScopeAPI;

    readonly session : ISessionAPI;

    readonly status : IStatusAPI;

    readonly token : IOAuth2TokenAPI;

    readonly trustAnchor : ITrustAnchorAPI;

    readonly user : IUserAPI;

    readonly userAttribute : IUserAttributeAPI;

    readonly userAuthenticator : IUserAuthenticatorAPI;

    readonly userInfo : IOAuth2UserInfoAPI;

    readonly userPermission : IUserPermissionAPI;

    readonly userRole : IUserRoleAPI;

    getJwks() : Promise<{ keys: OAuth2JsonWebKey[] }>;

    getJwk(id: string) : Promise<OAuth2JsonWebKey>;

    getWellKnownOpenIDConfiguration() : Promise<OpenIDProviderMetadata>;
}
