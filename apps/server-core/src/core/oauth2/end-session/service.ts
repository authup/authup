/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isSimpleURLMatch, isUUID } from '@authup/kit';
import type { Client, IdentityType } from '@authup/core-kit';
import { EventName, EventRefType, EventScope } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2TokenKind } from '@authup/specs';
import type { IEventService, IRealmRepository } from '../../entities/index.ts';
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

    protected eventService?: IEventService;

    protected hintGracePeriod: number;

    constructor(ctx: OAuth2EndSessionServiceContext) {
        this.tokenVerifier = ctx.tokenVerifier;
        this.sessionManager = ctx.sessionManager;
        this.clientRepository = ctx.clientRepository;
        this.realmRepository = ctx.realmRepository;
        this.eventService = ctx.eventService;
        this.hintGracePeriod = ctx.hintGracePeriod ?? 0;
    }

    async verify(data: OAuth2EndSessionRequest): Promise<OAuth2EndSessionResult> {
        let hintVerified = false;
        let sub: string | undefined;
        let subKind: string | undefined;
        let sessionId: string | undefined;
        let hintRealmId: string | undefined;
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
                if (payload.kind === OAuth2TokenKind.ID_TOKEN && this.isWithinHintGraceWindow(payload)) {
                    hintVerified = true;
                    sub = payload.sub;
                    subKind = payload.sub_kind;
                    sessionId = payload.sid ?? payload.session_id ?? undefined;
                    hintRealmId = payload.realm_id ?? undefined;
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

        // Resolve a single client for the aud cross-check and redirect
        // validation: the request's client_id, else the hint's sole audience
        // (ambiguous for a multi-aud hint).
        const clientId = data.client_id ?? (audiences.length === 1 ? audiences[0] : undefined);

        let client: Client | null = null;
        if (clientId) {
            // Scope a name-identified client to the request's realm hint; a
            // VERIFIED hint's own realm claim serves as fallback (claims from an
            // unverified hint are never trusted). No master fallback here
            // (unlike /token): a bogus hint must NOT silently resolve a
            // same-named client in master → null realm.
            const realmKey = data.realm_id ?? data.realm_name ?? (hintVerified ? hintRealmId : undefined);
            const realm = await this.realmRepository.resolve(realmKey, false);

            // Fail closed instead of dropping the realm predicate: a supplied
            // realm key that does not resolve never degrades to an unscoped
            // lookup, and a NAME-form client_id without any realm key is
            // ambiguous (client names are only unique per realm, and every
            // realm carries the same-named system clients — same rule as the
            // /authorize verifier). A UUID is globally unique and needs no
            // scope; the sole-aud-derived clientId is always a UUID.
            if (realm) {
                client = await this.clientRepository.findOneByIdOrName(clientId, realm.id);
            } else if (!realmKey && isUUID(clientId)) {
                client = await this.clientRepository.findOneByIdOrName(clientId);
            }
        }

        // aud/client_id cross-check: when the request supplies a client_id on a
        // verified hint, it MUST denote one of the hint's audiences. The aud is
        // the client UUID, so a name-form client_id is compared via its resolved
        // client's id. Fail closed: an aud-less hint, or a name that did not
        // resolve, counts as unverified.
        if (hintVerified && data.client_id) {
            const expected = isUUID(data.client_id) ? data.client_id : client?.id;
            if (audiences.length === 0 || !expected || !audiences.includes(expected)) {
                hintVerified = false;
                sub = undefined;
                subKind = undefined;
                sessionId = undefined;
            }
        }

        let clientName: string | undefined;
        let redirectUri: string | undefined;

        // Redirect validation is independent of hint verification — the
        // click-gated confirm page (unverified hint / hint-less request) still
        // honors a registered post-logout redirect.
        if (client) {
            clientName = client.name;
            if (
                data.post_logout_redirect_uri &&
                this.isValidPostLogoutRedirect(client.postLogoutRedirectUri, data.post_logout_redirect_uri)
            ) {
                redirectUri = data.post_logout_redirect_uri;
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
        if (session.sub !== sub || session.subKind !== subKind) {
            return false;
        }

        await this.sessionManager.revoke(sessionId);

        await this.eventService?.record({
            scope: EventScope.OAUTH2,
            name: EventName.LOGOUT,
            refType: EventRefType.SESSION,
            refId: sessionId,
            sessionId,
            actorType: session.subKind as `${IdentityType}`,
            actorId: session.sub,
            realmId: session.realmId,
        });

        return true;
    }

    /**
     * With a positive `hintGracePeriod`, an expired hint is honored only within
     * the window past `exp` — beyond it a leaked id_token stops being a
     * replayable remote logout (the hint counts as unverified; the click-gated
     * confirm page still works). 0 keeps spec/Keycloak parity: any expired hint.
     */
    protected isWithinHintGraceWindow(payload: OAuth2TokenPayload): boolean {
        if (this.hintGracePeriod <= 0) {
            return true;
        }

        // a bounded window without an exp claim to judge against fails closed
        if (typeof payload.exp !== 'number') {
            return false;
        }

        const nowSeconds = Math.floor(Date.now() / 1000);
        return nowSeconds - payload.exp <= this.hintGracePeriod;
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

        // isSimpleURLMatch, never isSimpleMatch: matched against the raw
        // string, a `*` in a registered pattern's host absorbs a `?`, `#` or
        // `\`, which would turn this endpoint into a server-issued open
        // redirect carrying `state`.
        return isSimpleURLMatch(candidate, registered.split(','));
    }
}
