/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import type {
    IAuthFlowMetrics,
    ICredentialsAuthenticator,
    IEventService,
    IIdentityPermissionProvider,
    IIdentityResolver,
    IKeyStore,
    ILoginThrottleService,
    IOAuth2AccessPolicyEvaluator,
    IOAuth2AuthorizationCodeVerifier,
    IOAuth2MfaLoginService,
    IOAuth2OpenIDTokenIssuer,
    IOAuth2TokenIssuer,
    IOAuth2TokenRepository,
    IOAuth2TokenRevoker,
    IOAuth2TokenVerifier,
    IRealmRepository,
    ISessionManager,
    ISessionTokenRepository,
    IUserAuthenticatorService,
    OAuth2ClientAuthenticator,
} from '../../../../../core/index.ts';
import type { CertificateSource } from '../../../request/index.ts';

export type TokenControllerContext = {
    codeVerifier: IOAuth2AuthorizationCodeVerifier,

    accessTokenIssuer: IOAuth2TokenIssuer,
    refreshTokenIssuer: IOAuth2TokenIssuer,
    openIdTokenIssuer: IOAuth2OpenIDTokenIssuer,
    keyStore: IKeyStore,
    tokenVerifier: IOAuth2TokenVerifier,
    tokenRevoker: IOAuth2TokenRevoker,
    tokenRepository: IOAuth2TokenRepository,
    sessionTokenRepository: ISessionTokenRepository,

    eventService?: IEventService,
    metrics?: IAuthFlowMetrics,
    loginThrottleService?: ILoginThrottleService,
    userAuthenticatorService?: IUserAuthenticatorService,
    mfaLoginService?: IOAuth2MfaLoginService,
    accessPolicyEvaluator?: IOAuth2AccessPolicyEvaluator,

    tokenRefreshGracePeriod?: number,
    logger?: Logger,

    sessionManager: ISessionManager,

    identityResolver: IIdentityResolver,
    identityPermissionProvider: IIdentityPermissionProvider,

    userAuthenticator: ICredentialsAuthenticator<User>

    oauth2ClientAuthenticator: OAuth2ClientAuthenticator

    realmRepository: IRealmRepository,
    certificateSource: CertificateSource,
};
