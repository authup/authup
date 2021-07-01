export type Oauth2ClientProtocolOptions = {
    scope?: string | string[],

    tokenHost: string,
    tokenPath?: string,

    clientId: string,
    clientSecret?: string,

    authorizeHost?: string,
    authorizePath?: string,
    authorizeRedirectURL?: string,

    userInfoHost?: string,
    userInfoPath?: string
}

// ------------------------------------------------------------------

export type Oauth2AuthorizeQueryParameters = {
    response_type: 'code',
    client_id: string,
    redirect_uri: string,
    scope?: string | string[]
}

// ------------------------------------------------------------------

export type Oauth2ClientAuthenticationParameters = {
    client_id?: string,
    client_secret?: string,
}

export type Oauth2ClientCredentialsGrantParameters = {
    grant_type: 'client_credentials',
    scope?: string  | string[]
} & Oauth2ClientAuthenticationParameters;

export type Oauth2PasswordGrantParameters = {
    grant_type: 'password',
    username: string,
    password: string,
    scope?: string  | string[]
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
