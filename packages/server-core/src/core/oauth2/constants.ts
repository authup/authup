/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

export const OAUTH2_AUTHORIZATION_CODE_ISSUER_TOKEN = Symbol('OAuth2AuthorizationCodeIssuer');
export const OAUTH2_AUTHORIZATION_CODE_VERIFIER_TOKEN = Symbol('OAuth2AuthorizationCodeVerifier');

export const OAUTH2_AUTHORIZATION_STATE_MANAGER_TOKEN = Symbol('OAuth2AuthorizationStateManager');

export const OAUTH2_AUTHORIZATION_CODE_REQUEST_VERIFIER_TOKEN = Symbol('OAuth2AuthorizationCodeRequestVerifier');

// ------------------------------------

export const OAUTH2_ACCESS_TOKEN_ISSUER_TOKEN = Symbol('OAuth2AccessTokenIssuer');
export const OAUTH2_OPEN_ID_TOKEN_ISSUER_TOKEN = Symbol('OAuth2OpenIDTokenIssuer');
export const OAUTH2_REFRESH_TOKEN_ISSUER_TOKEN = Symbol('OAuth2RefreshTokenIssuer');

export const OAUTH2_TOKEN_REVOKER_TOKEN = Symbol('OAuth2TokenRevoker');
export const OAUTH2_TOKEN_VERIFIER_TOKEN = Symbol('OAuth2TokenVerifier');
