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

    id_token?: string | null,

    nonce?: string | null,

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
};
