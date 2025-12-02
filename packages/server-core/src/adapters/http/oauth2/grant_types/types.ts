/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { Request } from 'routup';
import type { OAuth2AuthorizeGrantContext } from '../../../../core';
import type { IOAuth2AuthorizationCodeRepository } from '../../../../core/oauth2/authorize/code/repository';

export type HTTPOAuth2AuthorizeGrant = OAuth2AuthorizeGrantContext & {
    codeRepository: IOAuth2AuthorizationCodeRepository
};

export interface IHTTPGrant {
    runWithRequest(req: Request) : Promise<OAuth2TokenGrantResponse>
}
