/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum ErrorCode {
    AUTHORIZATION_HEADER_INVALID = 'auth_header_invalid',
    AUTHORIZATION_HEADER_PARSE = 'auth_header_parse',
    AUTHORIZATION_HEADER_TYPE_PARSE = 'auth_header_Type_parse',
    AUTH_HEADER_TYPE_UNSUPPORTED = 'auth_header_type_unsupported',
    CREDENTIALS_INVALID = 'invalid_credentials',
    TOKEN_INVALID = 'invalid_token',
    TOKEN_EXPIRED = 'invalid_token',
    TOKEN_SUB_KIND_INVALID = 'token_sub_kind_invalid',
}
