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
    DEVICE_CODE = 'oauth2_device_code',
    DEVICE_USER_CODE = 'oauth2_device_user_code',
    DEVICE_DECISION = 'oauth2_device_decision',
    DEVICE_POLL = 'oauth2_device_poll',
    DEVICE_LOOKUP_ATTEMPT = 'oauth2_device_lookup_attempt',
    FEDERATED_LOGIN = 'oauth2_federated_login',
    TOKEN = 'oauth2_token',
    TOKEN_CLAIMS = 'oauth2_token_claims',
    TOKEN_INACTIVE = 'oauth2_token_blocked',
}
