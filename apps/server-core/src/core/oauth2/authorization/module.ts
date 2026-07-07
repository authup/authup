/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity, OAuth2AuthorizationCode, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import {
    OAuth2AuthorizationPrompt,
    OAuth2AuthorizationResponseType,
    OAuth2GrantError,
    OAuth2LoginRequiredError,
    OAuth2RequestError,
    OAuth2ResponseTypeError,
    hasOAuth2Scopes,
} from '@authup/specs';
import type { IOAuth2OpenIDTokenIssuer, IOAuth2TokenIssuer } from '../token/index.ts';
import type { IOAuth2AuthorizationCodeIssuer } from './code/index.ts';
import { buildOAuth2TokenHash } from './helpers.ts';
import type {
    OAuth2AuthorizationManagerContext,
    OAuth2AuthorizationOptions,
    OAuth2AuthorizationResult,
} from './types.ts';
import type { IIdentityResolver } from '../../identity/index.ts';
import type { ISessionManager } from '../../authentication/index.ts';

const DEFAULT_PROMPT_LOGIN_MAX_AGE = 60;

export class OAuth2Authorization {
    protected accessTokenIssuer : IOAuth2TokenIssuer;

    protected openIdTokenIssuer : IOAuth2OpenIDTokenIssuer;

    protected codeIssuer : IOAuth2AuthorizationCodeIssuer;

    protected identityResolver : IIdentityResolver;

    protected sessionManager : ISessionManager;

    protected promptLoginMaxAge : number;

    constructor(ctx: OAuth2AuthorizationManagerContext) {
        this.accessTokenIssuer = ctx.accessTokenIssuer;
        this.openIdTokenIssuer = ctx.openIdTokenIssuer;
        this.codeIssuer = ctx.codeIssuer;
        this.identityResolver = ctx.identityResolver;
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
        const availableResponseTypes : string[] = Object.values(OAuth2AuthorizationResponseType);

        let responseTypes : string[] = [];
        if (data.response_type) {
            responseTypes = Array.isArray(data.response_type) ?
                data.response_type :
                data.response_type.split(' ');
        }

        const enabledResponseTypes : Record<string, boolean> = {};

        for (const responseType of responseTypes) {
            if (!availableResponseTypes.includes(responseType)) {
                throw OAuth2ResponseTypeError.unsupported();
            } else {
                enabledResponseTypes[responseType] = true;
            }
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
        if (data.realm_id && identity.data.realm.id !== data.realm_id) {
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
        if (typeof data.max_age !== 'undefined' && data.max_age !== null) {
            const maxAge = Number(data.max_age);
            if (Number.isFinite(maxAge) && nowSeconds - authTime > maxAge) {
                throw OAuth2LoginRequiredError.reauthenticationRequired();
            }
        }

        const payloadBaseNormalized : OAuth2TokenPayload = {

            sub: identity.data.id,
            sub_kind: identity.type,
            realm_id: identity.data.realm.id,
            realm_name: identity.data.realm.name,

            client_id: data.client_id,
            ...(data.scope ? { scope: data.scope } : {}),
            ...(data.nonce ? { nonce: data.nonce } : {}),
        };

        let codeEntity : OAuth2AuthorizationCode | undefined;

        if (enabledResponseTypes[OAuth2AuthorizationResponseType.TOKEN]) {
            const [token] = await this.accessTokenIssuer.issue(payloadBaseNormalized);

            output.accessToken = token;
        }

        if (enabledResponseTypes[OAuth2AuthorizationResponseType.CODE]) {
            codeEntity = await this.codeIssuer.issue(
                data,
                identity,
                { sessionId: options.sessionId },
            );

            output.authorizationCode = codeEntity.id;
        }

        const needsIdToken = enabledResponseTypes[OAuth2AuthorizationResponseType.ID_TOKEN] ||
            (data.scope && hasOAuth2Scopes(data.scope, ScopeName.OPEN_ID));

        if (needsIdToken) {
            const idTokenPayload : OAuth2TokenPayload = {
                ...payloadBaseNormalized,
                // OIDC id_token claims: real authentication time + session id.
                auth_time: authTime,
                ...(options.sessionId ? { sid: options.sessionId } : {}),
            };

            if (output.accessToken) {
                idTokenPayload.at_hash = await buildOAuth2TokenHash(output.accessToken);
            }
            if (output.authorizationCode) {
                idTokenPayload.c_hash = await buildOAuth2TokenHash(output.authorizationCode);
            }

            const [token] = await this.openIdTokenIssuer.issueWithIdentity(
                idTokenPayload,
                identity,
            );

            if (enabledResponseTypes[OAuth2AuthorizationResponseType.ID_TOKEN]) {
                output.idToken = token;
            }

            if (codeEntity) {
                await this.codeIssuer.updateIdToken(codeEntity, token);
            }
        }

        return output;
    }
}
