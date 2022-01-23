/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum ErrorCode {
    AUTH_HEADER_TYPE_UNSUPPORTED = 'auth_header_type_unsupported',
    CREDENTIALS_INVALID = 'invalid_credentials',

    TOKEN_INVALID = 'invalid_token',
    TOKEN_INACTIVE = 'inactive_token',
    TOKEN_EXPIRED = 'expired_token',
    TOKEN_SUB_KIND_INVALID = 'invalid_token_sub_kind',
}
