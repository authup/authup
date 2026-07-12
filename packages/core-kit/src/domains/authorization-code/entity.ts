/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2SubKind } from '@authup/specs';
import type { Client } from '../client';
import type { Realm } from '../realm';

export interface OAuth2AuthorizationCode {
    id: string,

    code_challenge?: string | null,

    code_challenge_method?: string | null,

    scope?: string | null,

    redirect_uri?: string | null,

    nonce?: string | null,

    /**
     * The authentication instant (seconds since epoch) captured when the code
     * was issued — the backing session's creation time for interactive flows,
     * the issuance instant for session-less ones. Carried into the id_token's
     * `auth_time` claim at the /token exchange.
     */
    auth_time?: number | null,

    /**
     * How the subject authenticated (SessionAuthMethod) — inherited by the
     * session the token exchange creates when no backing session exists
     * (federated IdP callback), and feeding the id_token amr/acr derivation.
     */
    auth_method?: string | null,

    /**
     * The acr_values the RP requested — persisted so the mint step can
     * compare requested vs satisfied assurance.
     */
    acr_values?: string | null,

    client_id?: Client['id'] | null,

    /**
     * The id of the session the authorizing bearer belongs to.
     *
     * Threaded from the (interactive) `/authorize` request so the
     * authorization_code grant can reuse that session instead of creating a
     * second one on token exchange. Absent for non-interactive / session-less
     * authorize flows, in which case the grant creates a fresh session.
     */
    session_id?: string | null,

    sub: string,

    sub_kind: `${OAuth2SubKind}`,

    realm_id: Realm['id'],

    realm_name: Realm['name'],
}

export type OAuth2AuthorizationCodeRequest = {
    response_type: string,
    client_id?: string,
    realm_id?: string,
    redirect_uri?: string,
    scope?: string,
    state?: string,
    nonce?: string,
    code_challenge?: string,
    code_challenge_method?: string,
    /**
     * OIDC Core §3.1.2.1: space-delimited list of `none|login|consent|select_account`.
     */
    prompt?: string,
    /**
     * OIDC Core §3.1.2.1: max acceptable age (seconds) of the authentication.
     */
    max_age?: number | string,
    /**
     * OIDC Core §3.1.2.1: login hint pre-filling the sign-in identifier.
     */
    login_hint?: string,
    /**
     * OIDC Core §3.1.2.1: space-delimited requested acr values. Voluntary
     * per §5.5.1.1 — unknown tokens are ignored; `urn:authup:mfa` acts as
     * a step-up trigger.
     */
    acr_values?: string,
};
