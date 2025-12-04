/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { Request } from 'routup';
import type {
    BaseGrantContext,
    IIdentityResolver,
    IOAuth2AuthorizationCodeRepository,
    OAuth2AuthorizeGrantContext,
    OAuth2PasswordGrantContext,
} from '../../../../../core';

export type HTTPOAuth2AuthorizeGrantContext = OAuth2AuthorizeGrantContext & {
    codeRepository: IOAuth2AuthorizationCodeRepository
};

export interface IHTTPGrant {
    runWithRequest(req: Request) : Promise<OAuth2TokenGrantResponse>
}

export type HTTPOAuth2PasswordGrantContext = OAuth2PasswordGrantContext & {
    identityResolver: IIdentityResolver
};

export type HTTPOAuth2ClientCredentialsGrantContext = BaseGrantContext & {
    identityResolver: IIdentityResolver
};

export type HTTPOAuth2RobotCredentialsGrantContext = BaseGrantContext & {
    identityResolver: IIdentityResolver
};
