/*
 * Copyright (c) 2024-2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

export enum CacheOAuth2Prefix {
    AUTHORIZATION_STATE = 'oauth2_authorization_state',
    AUTHORIZATION_CODE = 'oauth2_authorization_code',
    CONSOLE_LOGIN = 'oauth2_console_login',
    FEDERATED_LOGIN = 'oauth2_federated_login',
    TOKEN = 'oauth2_token',
    TOKEN_CLAIMS = 'oauth2_token_claims',
    TOKEN_INACTIVE = 'oauth2_token_blocked',
}
