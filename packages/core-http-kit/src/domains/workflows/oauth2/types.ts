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
import type {
    AuthorizeParameters,
    ClientAuthenticationParameters,
    Options,
    TokenAuthorizationCodeGrantParameters,
    TokenBaseOptions,
    TokenClientCredentialsGrantParameters,
    TokenGrantParameters,
    TokenIntrospectParameters,
    TokenPasswordGrantParameters,
    TokenRefreshTokenGrantParameters,
    TokenRevokeParameters,
    TokenRobotCredentialsGrantParameters,
} from '@hapic/oauth2';
import type { AuthorizationHeader, Response } from 'hapic';

/**
 * The OAuth2 protocol mechanics (and their parameter shapes) are owned
 * by @hapic/oauth2 — authup only re-exposes them under its naming
 * convention so the contracts below stay expressible without consumers
 * depending on @hapic/oauth2 directly.
 */
export type OAuth2APIOptions = Options;

export type OAuth2ClientAuthenticationParameters = ClientAuthenticationParameters;

export type OAuth2TokenClientCredentialsGrantParameters = TokenClientCredentialsGrantParameters;
/**
 * The `otp` field is an authup extension (not part of the RFC 6749 password
 * grant): a user holding a confirmed second factor supplies a TOTP or
 * recovery code alongside their credentials so the grant is not rejected
 * with `mfa_required`. It rides as an extra form field — the token request
 * transport serializes every string parameter.
 */
export type OAuth2TokenPasswordGrantParameters = TokenPasswordGrantParameters & {
    otp?: string,
};
export type OAuth2TokenAuthorizationCodeGrantParameters = TokenAuthorizationCodeGrantParameters;
export type OAuth2TokenRefreshTokenGrantParameters = TokenRefreshTokenGrantParameters;
export type OAuth2TokenRobotCredentialsGrantParameters = TokenRobotCredentialsGrantParameters;
export type OAuth2TokenGrantParameters = TokenGrantParameters;

export type OAuth2TokenRevokeParameters = TokenRevokeParameters;
export type OAuth2TokenIntrospectParameters = TokenIntrospectParameters;
export type OAuth2TokenRequestOptions = TokenBaseOptions;

export type OAuth2AuthorizeParameters = Partial<AuthorizeParameters>;

// ------------------------------------------------------------------

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

export interface IOAuth2AuthorizeAPI {
    buildURL(parameters?: OAuth2AuthorizeParameters) : string;

    confirm(data: OAuth2AuthorizationCodeRequest) : Promise<{ url: string }>;
}

export interface IOAuth2UserInfoAPI {
    get<T extends Record<string, any> = Record<string, any>>(
        header?: string | AuthorizationHeader,
    ) : Promise<T>;
}
