/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type OAuth2AuthorizationServiceOptions = {
    issuer: string,

    accessTokenMaxAge: number,

    authorizationCodeMaxAge: number,

    idTokenMaxAge: number
};

export type OAuth2AuthorizationResult = {
    authorizationCode?: string,
    accessToken?: string,
    idToken?: string,

    redirectUri: string,
    state?: string
};
