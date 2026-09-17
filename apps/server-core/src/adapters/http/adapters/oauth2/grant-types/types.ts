/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { IAppEvent } from 'routup';
import type {
    BaseGrantContext,
    IAuthFlowMetrics,
    ICredentialsAuthenticator,
    IEventService,
    ILoginThrottleService,
    IOAuth2AccessPolicyEvaluator,
    IOAuth2AuthorizationCodeVerifier,
    IOAuth2DeviceCodeVerifier,
    IOAuth2MfaLoginService,
    IRealmRepository,
    IUserAuthenticatorService,
    OAuth2AuthorizeGrantContext,
    OAuth2ClientAuthenticator,
    OAuth2PasswordGrantContext,
    OAuth2RefreshTokenGrantContext,
} from '../../../../../core/index.ts';
import type { CertificateSource } from '../../../request/index.ts';

export type HTTPOAuth2AuthorizeGrantContext = OAuth2AuthorizeGrantContext & {
    codeVerifier: IOAuth2AuthorizationCodeVerifier,
    clientAuthenticator: OAuth2ClientAuthenticator,
    realmRepository: IRealmRepository,
    accessPolicyEvaluator?: IOAuth2AccessPolicyEvaluator,
    /**
     * An access-policy denial at the token endpoint leaves the same
     * AUTHORIZE_FAILED row and `denied` count the interactive leg leaves
     * (#3575).
     */
    eventService?: IEventService,
    metrics?: IAuthFlowMetrics,
    certificateSource: CertificateSource,
};

export type HTTPOAuth2DeviceCodeGrantContext = OAuth2AuthorizeGrantContext & {
    deviceCodeVerifier: IOAuth2DeviceCodeVerifier,
    clientAuthenticator: OAuth2ClientAuthenticator,
    realmRepository: IRealmRepository,
    accessPolicyEvaluator?: IOAuth2AccessPolicyEvaluator,
    eventService?: IEventService,
    metrics?: IAuthFlowMetrics,
    certificateSource: CertificateSource,
};

export interface IHTTPOAuth2Grant {
    runWithRequest(event: IAppEvent) : Promise<OAuth2TokenGrantResponse>
}

export type HTTPOAuth2PasswordGrantContext = OAuth2PasswordGrantContext & {
    authenticator : ICredentialsAuthenticator<User>,
    clientAuthenticator: OAuth2ClientAuthenticator,
    realmRepository: IRealmRepository,
    loginThrottleService?: ILoginThrottleService,
    userAuthenticatorService?: IUserAuthenticatorService,
    mfaLoginService?: IOAuth2MfaLoginService,
    logger?: Logger,
    certificateSource: CertificateSource,
};

export type HTTPOAuth2RefreshTokenGrantContext = OAuth2RefreshTokenGrantContext & {
    clientAuthenticator: OAuth2ClientAuthenticator,
    realmRepository: IRealmRepository,
    certificateSource: CertificateSource,
};

export type HTTPOAuth2ClientCredentialsGrantContext = BaseGrantContext & {
    clientAuthenticator: OAuth2ClientAuthenticator,
    certificateSource: CertificateSource,
};

