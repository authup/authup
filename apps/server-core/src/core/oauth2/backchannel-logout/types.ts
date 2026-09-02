/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Session } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import type { IOAuth2ClientRepository } from '../client/types.ts';
import type { ISessionTokenRepository } from '../session-token/types.ts';
import type { IOAuth2TokenSigner } from '../token/signer/types.ts';

export type OAuth2BackchannelLogoutNotifierOptions = {
    /**
     * The issuer base (publicUrl). The logout token's `iss` is derived from
     * it the way every other token's is: `<issuer>/realms/<realm name>`.
     */
    issuer: string,
    /**
     * Logout token lifetime in seconds
     * (default: OAUTH2_BACKCHANNEL_LOGOUT_MAX_AGE).
     */
    maxAge?: number,
    /**
     * Per-delivery timeout in milliseconds
     * (default: OAUTH2_BACKCHANNEL_LOGOUT_TIMEOUT).
     */
    timeout?: number,
};

export type OAuth2BackchannelLogoutNotifierContext = {
    signer: IOAuth2TokenSigner,
    sessionTokenRepository: ISessionTokenRepository,
    clientRepository: IOAuth2ClientRepository,
    options: OAuth2BackchannelLogoutNotifierOptions,
    logger?: Logger,
};

export interface IOAuth2BackchannelLogoutNotifier {
    /**
     * The clients to notify when the session ends: every client a token of
     * the session was issued for that registered a back-channel logout URI.
     * Must run BEFORE the session row is removed, because the token rows the
     * audience is derived from cascade-delete with it.
     *
     * @param session
     */
    resolve(session: Session): Promise<Client[]>;

    /**
     * Push one logout token per client. Best effort: a refusing or
     * unreachable client is logged and never fails the revoke.
     *
     * @param session
     * @param clients
     */
    notify(session: Session, clients: Client[]): Promise<void>;
}
