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
