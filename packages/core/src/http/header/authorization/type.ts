/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum AuthorizationHeaderType {
    BEARER = 'Bearer',
    BASIC = 'Basic',
    X_API_KEY = 'X-API-Key',
    API_KEY = 'API-Key',
}

export interface AbstractAuthorizationHeader {
    type: `${AuthorizationHeaderType}`
}

export interface BearerAuthorizationHeader extends AbstractAuthorizationHeader {
    type: 'Bearer',
    token: string
}

export interface BasicAuthorizationHeader extends AbstractAuthorizationHeader {
    type: 'Basic',
    username: string,
    password: string
}

export interface APIKeyAuthorizationHeader extends AbstractAuthorizationHeader {
    type: 'API-Key' | 'X-API-Key',
    key: string
}

export type AuthorizationHeader =
    BasicAuthorizationHeader |
    BearerAuthorizationHeader |
    APIKeyAuthorizationHeader;
