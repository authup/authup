export type BearerAuthorizationHeaderValueType = 'Bearer';
export type BasicAuthorizationHeaderValueType = 'Basic';

export type AuthorizationHeaderValueType = BearerAuthorizationHeaderValueType | BasicAuthorizationHeaderValueType;

export type BasicAuthorizationHeaderValue = {
    type: BasicAuthorizationHeaderValueType,
    username: string,
    password: string
}

export type BearerAuthorizationHeaderValue = {
    type: BearerAuthorizationHeaderValueType,
    token: string
}

export type AuthorizationHeaderValue = BasicAuthorizationHeaderValue | BearerAuthorizationHeaderValue;
