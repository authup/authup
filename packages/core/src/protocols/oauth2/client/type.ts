/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type Oauth2ClientProtocolOptions = {
    client_id: string,
    client_secret?: string,

    scope?: string | string[],

    redirect_uri?: string,

    token_host: string,
    token_path?: string,

    authorize_host?: string,
    authorize_path?: string,

    user_info_host?: string,
    user_info_path?: string
};

// ------------------------------------------------------------------

export type Oauth2AuthorizeQueryParameters = {
    response_type: 'code',
    client_id: string,
    redirect_uri: string,
    scope?: string | string[]
};

// ------------------------------------------------------------------

export type Oauth2ClientAuthenticationParameters = {
    client_id?: string,
    client_secret?: string,
};

export type Oauth2ClientCredentialsGrantParameters = {
    grant_type: 'client_credentials',
    scope?: string | string[]
} & Oauth2ClientAuthenticationParameters;

export type Oauth2PasswordGrantParameters = {
    grant_type: 'password',
    username: string,
    password: string,
    scope?: string | string[]
} & Oauth2ClientAuthenticationParameters;

export type Oauth2AuthorizationGrantParameters = {
    grant_type: 'authorization_code',
    state: string,
    code: string,
    redirect_uri?: string,
} & Oauth2ClientAuthenticationParameters;

export type Oauth2RefreshTokenGrantParameters = {
    grant_type: 'refresh_token',
    refresh_token: string,
    scope?: string | string[]
} & Oauth2ClientAuthenticationParameters;

export type Oauth2GrantParameters =
    Oauth2ClientCredentialsGrantParameters |
    Oauth2PasswordGrantParameters |
    Oauth2AuthorizationGrantParameters |
    Oauth2RefreshTokenGrantParameters;
