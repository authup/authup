/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';

export type OAuth2TokenIssuerResponse = [string, OAuth2TokenPayload];
export type OAuth2TokenIssuerOptions = {
    /**
     * Max duration in seconds
     */
    maxAge?: number,

    /**
     * Token issuer name.
     */
    issuer?: string
};

export interface IOAuth2TokenIssuer {
    issue(input: OAuth2TokenPayload, options?: OAuth2TokenIssuerOptions) : Promise<OAuth2TokenIssuerResponse>;
}
