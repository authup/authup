/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityResolver } from '../identity';
import type { IOAuth2TokenIssuer } from '../token';
import type { IOAuth2AuthorizationCodeIssuer } from './code';

export type OAuth2AuthorizationManagerContext = {
    accessTokenIssuer: IOAuth2TokenIssuer,
    openIdTokenIssuer: IOAuth2TokenIssuer,
    codeIssuer: IOAuth2AuthorizationCodeIssuer,
    /**
     * todo: avoid this.
     */
    identityResolver: OAuth2IdentityResolver
};

export type OAuth2AuthorizationResult = {
    authorizationCode?: string,
    accessToken?: string,
    idToken?: string,

    redirectUri: string,
    state?: string
};
