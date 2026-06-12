/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type {
    OAuth2TokenGrantResponse,
    OAuth2TokenIntrospectionResponse,
} from '@authup/specs';
import type { AuthorizationHeader, Response } from 'hapic';

export type OAuth2APIOptions = {
    authorizationEndpoint?: string,
    tokenEndpoint?: string,
    introspectionEndpoint?: string,
    revocationEndpoint?: string,
    userinfoEndpoint?: string,

    clientId?: string,
    clientSecret?: string,
    redirectUri?: string,
    scope?: string | string[],
    realmId?: string,
};

// ------------------------------------------------------------------

export type OAuth2ClientAuthenticationParameters = {
    client_id?: string,
    client_secret?: string,
    realm_id?: string,
};

export type OAuth2TokenClientCredentialsGrantParameters = {
    grant_type: 'client_credentials',
    scope?: string | string[],
    realm_name?: string,
} & OAuth2ClientAuthenticationParameters;

export type OAuth2TokenPasswordGrantParameters = {
    grant_type: 'password',
    username: string,
    password: string,
    scope?: string | string[],
    realm_name?: string,
} & OAuth2ClientAuthenticationParameters;

export type OAuth2TokenAuthorizationCodeGrantParameters = {
    grant_type: 'authorization_code',
    code: string,
    code_verifier?: string,
    redirect_uri?: string,
} & OAuth2ClientAuthenticationParameters;

export type OAuth2TokenRefreshTokenGrantParameters = {
    grant_type: 'refresh_token',
    refresh_token: string,
    scope?: string | string[],
} & OAuth2ClientAuthenticationParameters;

export type OAuth2TokenRobotCredentialsGrantParameters = {
    grant_type: 'robot_credentials',
    id: string,
    secret: string,
} & OAuth2ClientAuthenticationParameters;

export type OAuth2TokenGrantParameters = OAuth2TokenClientCredentialsGrantParameters |
OAuth2TokenPasswordGrantParameters |
OAuth2TokenAuthorizationCodeGrantParameters |
OAuth2TokenRefreshTokenGrantParameters |
OAuth2TokenRobotCredentialsGrantParameters;

export type OAuth2TokenRevokeParameters = {
    token?: string,
    token_type_hint?: string,
} & OAuth2ClientAuthenticationParameters;

export type OAuth2TokenIntrospectParameters = {
    token?: string,
    token_type_hint?: string,
} & OAuth2ClientAuthenticationParameters;

export type OAuth2TokenRequestOptions = {
    /**
     * Inherit an existing authorization header of the underlying
     * transport for the current request.
     *
     * default: false
     */
    authorizationHeaderInherit?: boolean,

    /**
     * Set a custom authorization header for the current request.
     *
     * default: undefined
     */
    authorizationHeader?: string | AuthorizationHeader,

    clientId?: string,
    clientSecret?: string,
    realmId?: string,

    /**
     * Strip the client credentials from the request parameters and
     * send them as a Basic authorization header instead.
     *
     * default: false
     */
    clientCredentialsAsHeader?: boolean,
};

export interface IOAuth2TokenAPI {
    createWithRefreshToken(
        parameters: Omit<OAuth2TokenRefreshTokenGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse>;

    createWithClientCredentials(
        parameters?: Omit<OAuth2TokenClientCredentialsGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse>;

    createWithPassword(
        parameters: Omit<OAuth2TokenPasswordGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse>;

    createWithAuthorizationCode(
        parameters: Omit<OAuth2TokenAuthorizationCodeGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse>;

    createWithRobotCredentials(
        parameters: Omit<OAuth2TokenRobotCredentialsGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse>;

    create(
        parameters: OAuth2TokenGrantParameters,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse>;

    revoke(
        parameters?: OAuth2TokenRevokeParameters,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<Response>;

    introspect<T extends OAuth2TokenIntrospectionResponse = OAuth2TokenIntrospectionResponse>(
        parameters?: OAuth2TokenIntrospectParameters,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<T>;
}

// ------------------------------------------------------------------

export type OAuth2AuthorizeParameters = {
    response_type?: string | string[],
    response_mode?: string,
    client_id?: string,
    redirect_uri?: string,
    scope?: string | string[],
    state?: string,
    code_challenge?: string,
    code_challenge_method?: string,
};

export interface IOAuth2AuthorizeAPI {
    buildURL(parameters?: OAuth2AuthorizeParameters) : string;

    confirm(data: OAuth2AuthorizationCodeRequest) : Promise<{ url: string }>;
}

export interface IOAuth2UserInfoAPI {
    get<T extends Record<string, any> = Record<string, any>>(
        header?: string | AuthorizationHeader,
    ) : Promise<T>;
}
