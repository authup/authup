/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isSimpleMatch } from '@authup/kit';
import { OAuth2TokenKind } from '@authup/specs';
import type { IRealmRepository } from '../../entities/index.ts';
import type { ISessionManager } from '../../authentication/index.ts';
import type { IOAuth2ClientRepository } from '../client/index.ts';
import type { IOAuth2TokenVerifier } from '../token/index.ts';
import type {
    IOAuth2EndSessionService,
    OAuth2EndSessionRequest,
    OAuth2EndSessionResult,
    OAuth2EndSessionServiceContext,
} from './types.ts';

export class OAuth2EndSessionService implements IOAuth2EndSessionService {
    protected tokenVerifier: IOAuth2TokenVerifier;

    protected sessionManager: ISessionManager;

    protected clientRepository: IOAuth2ClientRepository;

    protected realmRepository: IRealmRepository;

    constructor(ctx: OAuth2EndSessionServiceContext) {
        this.tokenVerifier = ctx.tokenVerifier;
        this.sessionManager = ctx.sessionManager;
        this.clientRepository = ctx.clientRepository;
        this.realmRepository = ctx.realmRepository;
    }

    async verify(data: OAuth2EndSessionRequest): Promise<OAuth2EndSessionResult> {
        let hintVerified = false;
        let sub: string | undefined;
        let subKind: string | undefined;
        let sessionId: string | undefined;
        let audiences: string[] = [];

        if (data.id_token_hint) {
            try {
                // Signature + kind are the anchors; exp is skipped (a logout hint
                // is routinely expired) and the cache blocklist is irrelevant.
                const payload = await this.tokenVerifier.verify(data.id_token_hint, {
                    ignoreExpiry: true,
                    skipActiveCheck: true,
                });

                // MUST be an id_token — access/refresh tokens also carry
                // session_id, so accepting them would let a leaked access token
                // act as a logout weapon.
                if (payload.kind === OAuth2TokenKind.ID_TOKEN) {
                    hintVerified = true;
                    sub = payload.sub;
                    subKind = payload.sub_kind;
                    sessionId = payload.sid ?? payload.session_id ?? undefined;
                    // aud may be a single string or an array (JWT spec).
                    const { aud } = payload;
                    if (Array.isArray(aud)) {
                        audiences = aud.filter((entry): entry is string => typeof entry === 'string');
                    } else if (typeof aud === 'string') {
                        audiences = [aud];
                    }
                }
            } catch {
                // forged / unverifiable hint → stays unverified (no revoke)
            }
        }

        // aud/client_id cross-check: when the request supplies a client_id and the
        // hint carries an aud, the client_id MUST be one of the hint's audiences.
        if (hintVerified && data.client_id && audiences.length > 0 && !audiences.includes(data.client_id)) {
            hintVerified = false;
            sub = undefined;
            subKind = undefined;
            sessionId = undefined;
        }

        // Resolve a single client for redirect validation: the request's
        // client_id, else the hint's sole audience (ambiguous for a multi-aud hint).
        const clientId = data.client_id ?? (audiences.length === 1 ? audiences[0] : undefined);

        let clientName: string | undefined;
        let redirectUri: string | undefined;

        if (clientId) {
            // Scope a name-identified client to the realm hint. No master
            // fallback here (unlike /token): a bogus hint must NOT silently
            // resolve a same-named client in master → null realm, and the
            // repository fails closed on an unknown realm key.
            const realm = await this.realmRepository.resolve(data.realm_id ?? data.realm_name, false);
            const client = await this.clientRepository.findOneByIdOrName(clientId, realm?.id);
            if (client) {
                clientName = client.name;
                if (
                    data.post_logout_redirect_uri &&
                    this.isValidPostLogoutRedirect(client.post_logout_redirect_uri, data.post_logout_redirect_uri)
                ) {
                    redirectUri = data.post_logout_redirect_uri;
                }
            }
        }

        return {
            hintVerified,
            ...(hintVerified ? {
                sub,
                subKind,
                sessionId,
            } : {}),
            ...(clientId ? { clientId } : {}),
            ...(clientName ? { clientName } : {}),
            ...(redirectUri ? { redirectUri, ...(data.state ? { state: data.state } : {}) } : {}),
        };
    }

    async revoke(sessionId: string, sub: string, subKind: string): Promise<boolean> {
        const session = await this.sessionManager.findOneById(sessionId);
        if (!session) {
            return false;
        }

        // Never revoke a session that does not belong to the hint's subject.
        if (session.sub !== sub || session.sub_kind !== subKind) {
            return false;
        }

        await this.sessionManager.revoke(sessionId);
        return true;
    }

    /**
     * A post-logout redirect is honored only when it is an absolute http(s) URL
     * that matches a registered client redirect pattern (defense against open
     * redirects to attacker-controlled URLs).
     */
    protected isValidPostLogoutRedirect(
        registered: string | null | undefined,
        candidate: string,
    ): boolean {
        let parsed: URL;
        try {
            parsed = new URL(candidate);
        } catch {
            return false;
        }

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return false;
        }

        if (!registered) {
            return false;
        }

        return isSimpleMatch(candidate, registered.split(','));
    }
}
