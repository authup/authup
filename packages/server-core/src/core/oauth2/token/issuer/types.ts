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
    /**
     * Issue new token.
     *
     * @param input
     */
    issue(input: OAuth2TokenPayload) : Promise<OAuth2TokenIssuerResponse>;

    /**
     * Build expiration time in seconds (utc).
     *
     * @param input
     */
    buildExp(input?: OAuth2TokenPayload) : number;
}
