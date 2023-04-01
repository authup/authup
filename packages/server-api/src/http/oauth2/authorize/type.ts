/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type AuthorizeRequestOptions = {
    issuer: string,

    accessTokenMaxAge?: number,

    authorizationCodeMaxAge?: number,

    idTokenMaxAge?: number
};

export type AuthorizeRequestResult = {
    authorizationCode?: string,
    accessToken?: string,
    idToken?: string,

    redirectUri: string,
    state?: string
};
