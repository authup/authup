export type Oauth2TokenResponse = {
    accessToken: string,
    accessTokenPayload?: AccessTokenPayload,
    refreshToken?: string,
    expiresIn: number,
    tokenType: string,
    idToken?: string,
    idTokenPayload?: Record<string, any>,
    macKey?: string,
    macAlgorithm?: string
}


export type AccessTokenPayload = {
    /**
     * Subject (user id)
     */
    sub: string | number,
    /**
     * Issuer (token endpoint, f.e "https://...")
     */
    iss: string,
    /**
     * client id
     */
    cid: string,

    /**
     * Issued At
     */
    iat: number,

    /**
     * Expires At
     */
    exp: number,

    /**
     * Scopes (f.e: "scope1 scope2")
     */
    scope: string,

    /**
     * Additional parameters
     */
    [key: string]: any
}
