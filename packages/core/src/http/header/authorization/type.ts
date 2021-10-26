/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type BearerAuthorizationHeaderValueType = 'Bearer';
export type BasicAuthorizationHeaderValueType = 'Basic';
export type APIKeyAuthorizationHeaderValueType = 'X-API-Key' | 'API-Key'

export type AuthorizationHeaderValueType =
    BearerAuthorizationHeaderValueType |
    BasicAuthorizationHeaderValueType |
    APIKeyAuthorizationHeaderValueType;

export type BearerAuthorizationHeaderValue = {
    type: BearerAuthorizationHeaderValueType,
    token: string
}

export type BasicAuthorizationHeaderValue = {
    type: BasicAuthorizationHeaderValueType,
    username: string,
    password: string
}

export type APIKeyAuthorizationHeaderValue = {
    type: APIKeyAuthorizationHeaderValueType,
    key: string
}

export type AuthorizationHeaderValue =
    BasicAuthorizationHeaderValue |
    BearerAuthorizationHeaderValue |
    APIKeyAuthorizationHeaderValue;
