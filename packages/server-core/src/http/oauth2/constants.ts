/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum OAuth2CachePrefix {
    AUTHORIZATION_STATE = 'oauth2_authorization_state',
    AUTHORIZATION_CODE = 'oauth2_authorization_code',
    TOKEN_CLAIMS = 'oauth2_token_claims',
    TOKEN_INACTIVE = 'oauth2_token_blocked',
}
