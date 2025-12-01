/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type { Oauth2Identity } from '../../../identity';

export type OAuth2AuthorizationCodeIssuerOptions = {
    /**
     * Max duration in seconds
     */
    maxAge?: number,

    idToken?: string,
};

export interface IOAuth2AuthorizationCodeIssuer {
    issue(
        input: OAuth2AuthorizationCodeRequest,
        identity: Oauth2Identity,
        options?: OAuth2AuthorizationCodeIssuerOptions
    ) : Promise<OAuth2AuthorizationCode>;
}
