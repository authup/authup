/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IOAuth2OpenIDTokenIssuer, IOAuth2TokenIssuer } from '../token/index.ts';
import type { IOAuth2AuthorizationCodeIssuer } from './code/index.ts';
import type { IIdentityResolver } from '../../identity/index.ts';

export type OAuth2AuthorizationManagerContext = {
    accessTokenIssuer: IOAuth2TokenIssuer,
    openIdTokenIssuer: IOAuth2OpenIDTokenIssuer,
    codeIssuer: IOAuth2AuthorizationCodeIssuer,
    identityResolver: IIdentityResolver
};

export type OAuth2AuthorizationResult = {
    authorizationCode?: string,
    accessToken?: string,
    idToken?: string,

    redirectUri: string,
    state?: string
};
