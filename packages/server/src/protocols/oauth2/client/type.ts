export type Oauth2ClientProtocolOptions = {
    scope?: string | string[],

    tokenHost: string,
    tokenPath?: string,

    clientId: string,
    clientSecret?: string,

    authorizeRedirectURL: string
}

export type Oauth2ClientTokenResponse = {
    accessToken: string,
    accessTokenPayload?: unknown,
    refreshToken?: string,
    expiresIn: Date | string
}

export type Oauth2ClientPasswordGrantParameters = {
    username: string,
    password: string
}

export type Oauth2ClientAuthorizationGrantParameters = {
    state: string,
    code: string
}
