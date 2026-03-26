/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypedToken } from 'eldin';
import type {
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRepository,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationCodeVerifier,
    IOAuth2AuthorizationStateManager,
    IOAuth2AuthorizeStateRepository,
    IOAuth2ClientRepository,
    IOAuth2KeyRepository,
    IOAuth2OpenIDTokenIssuer,
    IOAuth2ScopeRepository,
    IOAuth2TokenIssuer,
    IOAuth2TokenRepository,
    IOAuth2TokenRevoker,
    IOAuth2TokenSigner,
    IOAuth2TokenVerifier,
} from '../../../core/index.ts';

export const OAuth2InjectionToken = {
    ClientRepository: new TypedToken<IOAuth2ClientRepository>('ClientRepository'),
    ScopeRepository: new TypedToken<IOAuth2ScopeRepository>('ScopeRepository'),

    AuthorizationCodeIssuer: new TypedToken<IOAuth2AuthorizationCodeIssuer>('AuthorizationCodeIssuer'),
    AuthorizationCodeRepository: new TypedToken<IOAuth2AuthorizationCodeRepository>('AuthorizationCodeRepository'),
    AuthorizationCodeVerifier: new TypedToken<IOAuth2AuthorizationCodeVerifier>('AuthorizationCodeVerifier'),
    AuthorizationStateManager: new TypedToken<IOAuth2AuthorizationStateManager>('AuthorizationStateManager'),
    AuthorizationCodeRequestVerifier: new TypedToken<IOAuth2AuthorizationCodeRequestVerifier>('AuthorizationCodeRequestVerifier'),

    AuthorizationStateRepository: new TypedToken<IOAuth2AuthorizeStateRepository>('AuthorizationStateRepository'),

    KeyRepository: new TypedToken<IOAuth2KeyRepository>('KeyRepository'),

    AccessTokenIssuer: new TypedToken<IOAuth2TokenIssuer>('AccessTokenIssuer'),
    OpenIDTokenIssuer: new TypedToken<IOAuth2OpenIDTokenIssuer>('OpenIDTokenIssuer'),
    RefreshTokenIssuer: new TypedToken<IOAuth2TokenIssuer>('RefreshTokenIssuer'),

    TokenRepository: new TypedToken<IOAuth2TokenRepository>('TokenRepository'),
    TokenRevoker: new TypedToken<IOAuth2TokenRevoker>('TokenRevoker'),
    TokenSigner: new TypedToken<IOAuth2TokenSigner>('TokenSigner'),
    TokenVerifier: new TypedToken<IOAuth2TokenVerifier>('TokenVerifier'),
} as const;
