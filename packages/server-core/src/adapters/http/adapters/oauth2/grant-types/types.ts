/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Robot, User } from '@authup/core-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { Request } from 'routup';
import type {
    BaseGrantContext,
    ICredentialsAuthenticator,
    IOAuth2AuthorizationCodeVerifier,
    OAuth2AuthorizeGrantContext,
    OAuth2PasswordGrantContext,
} from '../../../../../core';

export type HTTPOAuth2AuthorizeGrantContext = OAuth2AuthorizeGrantContext & {
    codeVerifier: IOAuth2AuthorizationCodeVerifier
};

export interface IHTTPGrant {
    runWithRequest(req: Request) : Promise<OAuth2TokenGrantResponse>
}

export type HTTPOAuth2PasswordGrantContext = OAuth2PasswordGrantContext & {
    authenticator : ICredentialsAuthenticator<User>
};

export type HTTPOAuth2ClientCredentialsGrantContext = BaseGrantContext & {
    authenticator : ICredentialsAuthenticator<Client>
};

export type HTTPOAuth2RobotCredentialsGrantContext = BaseGrantContext & {
    authenticator : ICredentialsAuthenticator<Robot>
};
