/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAuditEventService, IRealmRepository } from '../../entities/index.ts';
import type { ISessionManager } from '../../authentication/index.ts';
import type { IOAuth2ClientRepository } from '../client/index.ts';
import type { IOAuth2TokenVerifier } from '../token/index.ts';

export type OAuth2EndSessionRequest = {
    id_token_hint?: string,
    client_id?: string,
    post_logout_redirect_uri?: string,
    state?: string,
    realm_id?: string,
    realm_name?: string,
};

export type OAuth2EndSessionResult = {
    /**
     * True when a signature-verified id_token_hint proved possession. Only then
     * are `sub` / `sessionId` populated and a server-side revoke authorized.
     */
    hintVerified: boolean,
    sub?: string,
    subKind?: string,
    sessionId?: string,
    clientId?: string,
    clientName?: string,
    /**
     * The post-logout redirect — present ONLY when it matched a registered
     * client pattern (open-redirect guard). `state` rides only alongside it.
     */
    redirectUri?: string,
    state?: string,
};

export type OAuth2EndSessionServiceContext = {
    tokenVerifier: IOAuth2TokenVerifier,
    sessionManager: ISessionManager,
    clientRepository: IOAuth2ClientRepository,
    realmRepository: IRealmRepository,
    auditEventService?: IAuditEventService,
    /**
     * Seconds past its `exp` an (expired) id_token_hint is still accepted for
     * a server-side revoke (config `endSessionHintGracePeriod`).
     * 0 (default) = unbounded — spec/Keycloak parity.
     */
    hintGracePeriod?: number,
};

export interface IOAuth2EndSessionService {
    /**
     * Verify the request (id_token_hint signature + kind + aud, redirect
     * validation). Pure — performs no mutation.
     */
    verify(data: OAuth2EndSessionRequest): Promise<OAuth2EndSessionResult>;

    /**
     * Revoke the session ONLY when it belongs to the hint's subject.
     * @returns whether a session was revoked.
     */
    revoke(sessionId: string, sub: string, subKind: string): Promise<boolean>;
}
