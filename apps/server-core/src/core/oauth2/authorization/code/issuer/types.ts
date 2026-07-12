/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity, OAuth2AuthorizationCode, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';

export type OAuth2AuthorizationCodeIssuerOptions = {
    /**
     * Max duration in seconds
     */
    maxAge?: number,

    /**
     * The id of the session the authorizing bearer belongs to, persisted on the
     * authorization code so the token exchange can reuse it.
     */
    sessionId?: string | null,

    /**
     * The authentication instant (seconds since epoch) — persisted on the code
     * for the id_token `auth_time` claim minted at the /token exchange.
     * Defaults to the issuance instant (session-less flows authenticate now).
     */
    authTime?: number,

    /**
     * How the subject authenticated (SessionAuthMethod) — persisted on the
     * code so a session created at the /token exchange inherits it.
     */
    authMethod?: string | null,
};

export interface IOAuth2AuthorizationCodeIssuer {
    issue(
        input: OAuth2AuthorizationCodeRequest,
        identity: Identity,
        options?: OAuth2AuthorizationCodeIssuerOptions
    ) : Promise<OAuth2AuthorizationCode>;
}
