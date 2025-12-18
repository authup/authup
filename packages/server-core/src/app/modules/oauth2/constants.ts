/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const OAuth2InjectionToken = {
    ClientRepository: Symbol('ClientRepository'),
    ClientScopeRepository: Symbol('ClientScopeRepository'),

    AuthorizationCodeIssuer: Symbol('AuthorizationCodeIssuer'),
    AuthorizationCodeRepository: Symbol('AuthorizationCodeRepository'),
    AuthorizationCodeVerifier: Symbol('AuthorizationCodeVerifier'),
    AuthorizationStateManager: Symbol('AuthorizationStateManager'),
    AuthorizationCodeRequestVerifier: Symbol('AuthorizationCodeRequestVerifier'),

    AuthorizationStateRepository: Symbol('AuthorizationStateRepository'),

    KeyRepository: Symbol('KeyRepository'),

    AccessTokenIssuer: Symbol('AccessTokenIssuer'),
    OpenIDTokenIssuer: Symbol('OpenIDTokenIssuer'),
    RefreshTokenIssuer: Symbol('RefreshTokenIssuer'),

    TokenRepository: Symbol('TokenRepository'),
    TokenRevoker: Symbol('TokenRevoker'),
    TokenSigner: Symbol('TokenSigner'),
    TokenVerifier: Symbol('TokenVerifier'),
};
