/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum OAuth2TokenGrant {
    AUTHORIZATION_CODE = 'authorization_code',
    CLIENT_CREDENTIALS = 'client_credentials',
    PASSWORD = 'password',
    ROBOT_CREDENTIALS = 'robot_credentials',
    REFRESH_TOKEN = 'refresh_token',
}

export enum OAuth2TokenKind {
    ACCESS = 'access_token',
    ID_TOKEN = 'id_token',
    REFRESH = 'refresh_token',
}

export enum OAuth2SubKind {
    CLIENT = 'client',
    USER = 'user',
    ROBOT = 'robot',
}

export enum OAuth2AuthorizationResponseType {
    NONE = 'none',
    CODE = 'code',
    TOKEN = 'token',
    ID_TOKEN = 'id_token',
}

export enum OAuth2AuthorizationCodeChallengeMethod {
    SHA_256 = 'S256',
    PLAIN = 'plain',
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
 */
export enum OAuth2ErrorCode {
    INVALID_REQUEST = 'invalid_request',

    INVALID_CLIENT = 'invalid_client',

    INVALID_GRANT = 'invalid_grant',

    UNAUTHORIZED_CLIENT = 'unauthorized_client',

    UNSUPPORTED_GRANT_TYPE = 'unsupported_grant_type',

    INVALID_SCOPE = 'invalid_scope',
}
