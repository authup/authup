/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity, OAuth2AuthorizationCode, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import {
    OAuth2AuthorizationPrompt,
    OAuth2AuthorizationResponseType,
    OAuth2GrantError,
    OAuth2LoginRequiredError,
    OAuth2RequestError,
    OAuth2ResponseTypeError,
} from '@authup/specs';
import type { IOAuth2AuthorizationCodeIssuer } from './code/index.ts';
import type {
    OAuth2AuthorizationManagerContext,
    OAuth2AuthorizationOptions,
    OAuth2AuthorizationResult,
} from './types.ts';
import type { ISessionManager } from '../../authentication/index.ts';

const DEFAULT_PROMPT_LOGIN_MAX_AGE = 60;

export class OAuth2Authorization {
    protected codeIssuer : IOAuth2AuthorizationCodeIssuer;

    protected sessionManager : ISessionManager;

    protected promptLoginMaxAge : number;

    constructor(ctx: OAuth2AuthorizationManagerContext) {
        this.codeIssuer = ctx.codeIssuer;
        this.sessionManager = ctx.sessionManager;
        this.promptLoginMaxAge = ctx.promptLoginMaxAge ?? DEFAULT_PROMPT_LOGIN_MAX_AGE;
    }

    /**
     * Authorize with validated codeRequest.
     *
     * @param data
     * @param identity
     * @param options
     */
    async authorize(
        data: OAuth2AuthorizationCodeRequest,
        identity: Identity,
        options: OAuth2AuthorizationOptions = {},
    ) : Promise<OAuth2AuthorizationResult> {
        // OAuth 2.1 posture: only the authorization-code response type is
        // supported — implicit/hybrid (token, id_token, none) were dropped
        // (plan 042 item 3). Defense in depth behind the request validator.
        let responseTypes : string[] = [];
        if (data.response_type) {
            responseTypes = Array.isArray(data.response_type) ?
                data.response_type :
                data.response_type.split(' ');
        }

        for (const responseType of responseTypes) {
            if (responseType !== OAuth2AuthorizationResponseType.CODE) {
                throw OAuth2ResponseTypeError.unsupported();
            }
        }

        if (!responseTypes.includes(OAuth2AuthorizationResponseType.CODE)) {
            throw OAuth2ResponseTypeError.unsupported();
        }

        if (!data.redirect_uri) {
            throw OAuth2GrantError.redirectUriMismatch();
        }

        const output : OAuth2AuthorizationResult = {
            redirectUri: data.redirect_uri,
            ...(data.state ? { state: data.state } : {}),
        };

        if (!identity) {
            throw OAuth2RequestError.identityInvalid();
        }

        // Realm binding: the code-request verifier stamped data.realm_id with the
        // resolved client's realm. The authenticated identity must belong to that
        // same realm — otherwise a lingering session for realm A could silently
        // mint a code/token for realm B's client (confused deputy). The error body
        // deliberately carries no identity data (no realm-enumeration oracle).
        // A dangling realm relation (realm row deleted out from under the
        // identity) fails the same way — clean login_required, never a TypeError.
        if (
            data.realm_id &&
            identity.data.realm_id !== data.realm_id
        ) {
            throw OAuth2LoginRequiredError.realmMismatch();
        }

        // Authentication time = the backing session's creation instant (NOT
        // refreshed_at — a token refresh must not reset it). Session-less flows
        // (e.g. HTTP Basic authorize) present live credentials on this request,
        // so the authentication time is "now".
        const nowSeconds = Math.floor(Date.now() / 1000);
        let authTime = nowSeconds;
        if (options.sessionId) {
            const session = await this.sessionManager.findOneById(options.sessionId);
            if (session && session.created_at) {
                authTime = Math.floor(new Date(session.created_at).getTime() / 1000);
            }
        }

        // OIDC §3.1.2.1 prompt=login / max_age freshness (enforced only when
        // requested — a plain authorize never throws here). The hosted page
        // renders the login form for prompt=login; this is the server backstop.
        const prompts = data.prompt ? data.prompt.split(' ') : [];
        if (
            prompts.includes(OAuth2AuthorizationPrompt.LOGIN) &&
            nowSeconds - authTime > this.promptLoginMaxAge
        ) {
            throw OAuth2LoginRequiredError.reauthenticationRequired();
        }

        if (
            typeof data.max_age !== 'undefined' &&
            data.max_age !== null
        ) {
            const maxAge = Number(data.max_age);
            if (
                Number.isFinite(maxAge) &&
                nowSeconds - authTime > maxAge
            ) {
                throw OAuth2LoginRequiredError.reauthenticationRequired();
            }
        }

        // The id_token is NOT minted here — the /token exchange mints it after
        // resolving the real backing session, so its `sid` is authoritative
        // (plan 042 item 6). The code carries the authentication instant.
        const codeEntity : OAuth2AuthorizationCode = await this.codeIssuer.issue(
            data,
            identity,
            { sessionId: options.sessionId, authTime },
        );

        output.authorizationCode = codeEntity.id;

        return output;
    }
}
