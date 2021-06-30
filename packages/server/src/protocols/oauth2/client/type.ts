export type Oauth2ClientProtocolOptions = {
    scope?: string | string[],

    tokenHost: string,
    tokenPath?: string,

    clientId: string,
    clientSecret?: string,

    authorizeRedirectURL: string
}

export type Oauth2TokenResponse = {
    accessToken: string,
    accessTokenPayload?: unknown,
    refreshToken?: string,
    expiresIn: number,
    tokenType: string,
    idToken?: string,
    macKey?: string,
    macAlgorithm?: string
}

export type Oauth2ClientPasswordGrantParameters = {
    username: string,
    password: string
}

export type Oauth2ClientAuthorizationGrantParameters = {
    state: string,
    code: string
}
