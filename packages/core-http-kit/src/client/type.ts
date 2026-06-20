/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2JsonWebKey, OpenIDProviderMetadata } from '@authup/specs';
import type { IClient as IHapicClient, RequestBaseOptions } from 'hapic';
import type {
    IClientAPI,
    IClientPermissionAPI,
    IClientRoleAPI,
    IClientScopeAPI,
    IIdentityProviderAPI,
    IIdentityProviderRoleMappingAPI,
    IOAuth2AuthorizeAPI,
    IOAuth2TokenAPI,
    IOAuth2UserInfoAPI,
    IPermissionAPI,
    IPermissionPolicyAPI,
    IPolicyAPI,
    IRealmAPI,
    IRobotAPI,
    IRobotPermissionAPI,
    IRobotRoleAPI,
    IRoleAPI,
    IRoleAttributeAPI,
    IRolePermissionAPI,
    IScopeAPI,
    IStatusAPI,
    IUserAPI,
    IUserAttributeAPI,
    IUserPermissionAPI,
    IUserRoleAPI,
} from '../domains';

export type ClientOptions = RequestBaseOptions;

/**
 * The base transport contract authup builds on, sourced from hapic's
 * published `IClient` interface (hapic >= 3 ships it as the primary
 * client type, which `hapic`'s own `Client` class `implements`). authup
 * extends it below rather than mirroring the concrete class structurally
 * — contract-first, no implementation-derived type.
 */
export type ClientBase = IHapicClient;

/**
 * Replaceable contract of the authup HTTP client: the base transport
 * surface plus every sub-API behind its interface. Implemented by
 * `Client`; any test double satisfying it can substitute.
 */
export interface IClient extends ClientBase {
    readonly authorize : IOAuth2AuthorizeAPI;

    readonly client : IClientAPI;

    readonly clientPermission : IClientPermissionAPI;

    readonly clientRole : IClientRoleAPI;

    readonly clientScope : IClientScopeAPI;

    readonly identityProvider : IIdentityProviderAPI;

    readonly identityProviderRoleMapping : IIdentityProviderRoleMappingAPI;

    readonly permission : IPermissionAPI;

    readonly permissionPolicy : IPermissionPolicyAPI;

    readonly policy : IPolicyAPI;

    readonly realm : IRealmAPI;

    readonly robot : IRobotAPI;

    readonly robotPermission : IRobotPermissionAPI;

    readonly robotRole : IRobotRoleAPI;

    readonly role : IRoleAPI;

    readonly roleAttribute : IRoleAttributeAPI;

    readonly rolePermission : IRolePermissionAPI;

    readonly scope : IScopeAPI;

    readonly status : IStatusAPI;

    readonly token : IOAuth2TokenAPI;

    readonly user : IUserAPI;

    readonly userAttribute : IUserAttributeAPI;

    readonly userInfo : IOAuth2UserInfoAPI;

    readonly userPermission : IUserPermissionAPI;

    readonly userRole : IUserRoleAPI;

    getJwks() : Promise<{ keys: OAuth2JsonWebKey[] }>;

    getJwk(id: string) : Promise<OAuth2JsonWebKey>;

    getWellKnownOpenIDConfiguration() : Promise<OpenIDProviderMetadata>;
}
