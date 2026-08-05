/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { JWKUse, hasOAuth2Scopes } from '@authup/specs';
import type { OAuth2AuthorizationCode, Session } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { buildOAuth2TokenHash, deriveAmrAcr } from '../authorization/helpers.ts';
import type { IKeyStore } from '../../key/index.ts';
import type { IOAuth2OpenIDTokenIssuer, IOAuth2TokenIssuer } from '../token/index.ts';
import { OAuth2BaseGrant } from './base.ts';
import type { IOAuth2Grant, OAuth2AuthorizeGrantContext, OAuth2GrantRunWIthOptions } from './types.ts';
import type { OAuth2BearerResponseBuildContext } from '../response/index.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';

export class OAuth2AuthorizeGrant extends OAuth2BaseGrant<OAuth2AuthorizationCode> implements IOAuth2Grant {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    protected openIdTokenIssuer : IOAuth2OpenIDTokenIssuer;

    protected keyStore : IKeyStore;

    constructor(ctx: OAuth2AuthorizeGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
            sessionManager: ctx.sessionManager,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
        this.openIdTokenIssuer = ctx.openIdTokenIssuer;
        this.keyStore = ctx.keyStore;
    }

    async runWith(
        authorizationCode: OAuth2AuthorizationCode,
        options: OAuth2GrantRunWIthOptions = {},
    ) : Promise<OAuth2TokenGrantResponse> {
        const session = await this.resolveSession(authorizationCode, options);

        // amr/acr derive from the RESOLVED session (authMethod + mfaAt) —
        // deliberately on every token kind, not only the id_token, so
        // resource servers can read the method without parsing an id_token.
        const amrAcr = deriveAmrAcr(session);

        const issuePayload : Partial<OAuth2TokenPayload> = {
            user_agent: options.userAgent,
            remote_address: options.ipAddress,
            session_id: session.id,
            sub: authorizationCode.sub || undefined,
            sub_kind: authorizationCode.sub_kind,
            realm_id: authorizationCode.realm_id,
            realm_name: authorizationCode.realm_name,
            scope: authorizationCode.scope || undefined,
            client_id: authorizationCode.client_id || undefined,
            ...(options.confirmation ? { cnf: options.confirmation } : {}),
            ...amrAcr,
        };

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue(issuePayload);
        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(issuePayload);

        const buildContext : OAuth2BearerResponseBuildContext = {
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        };

        // The id_token is minted HERE — after resolveSession — so its `sid`
        // references the real backing session for the reuse branch, the
        // fallback branch, and session-less (federated IdP) codes alike.
        // `auth_time` is the authentication instant captured on the code.
        if (
            authorizationCode.scope &&
            hasOAuth2Scopes(authorizationCode.scope, ScopeName.OPEN_ID)
        ) {
            // The at_hash digest follows the id_token's JWS alg (OIDC Core
            // §3.1.3.6) — the alg of the realm key the openid issuer signs
            // with. The access token above was signed with the same key, so a
            // missing key would already have thrown; this resolves the same
            // active key.
            const key = await this.keyStore.resolveOrCreate(authorizationCode.realm_id, JWKUse.SIGNATURE);

            const [idToken] = await this.openIdTokenIssuer.issue({
                sub: authorizationCode.sub || undefined,
                sub_kind: authorizationCode.sub_kind,
                realm_id: authorizationCode.realm_id,
                realm_name: authorizationCode.realm_name,
                scope: authorizationCode.scope || undefined,
                client_id: authorizationCode.client_id || undefined,
                ...(authorizationCode.nonce ? { nonce: authorizationCode.nonce } : {}),
                ...(typeof authorizationCode.auth_time === 'number' ? { auth_time: authorizationCode.auth_time } : {}),
                ...amrAcr,
                sid: session.id,
                at_hash: await buildOAuth2TokenHash(accessToken, key.signatureAlgorithm),
            });

            buildContext.idToken = idToken;
        }

        return buildOAuth2BearerTokenResponse(buildContext);
    }

    /**
     * Reuse the bearer's session when the authorization code was issued from an
     * (interactive) `/authorize` request that carried one — otherwise the
     * interactive login would create a second session (the abandoned bearer
     * session that authenticated `POST /authorize`, plus this one).
     *
     * The reuse is gated on the session still existing and belonging to the
     * same subject/realm as the code (defense in depth — the id is
     * server-derived from the authenticated bearer, never client input). Any
     * mismatch, or a session-less authorize flow (external IdP, non-interactive
     * clients), falls back to creating a fresh session — preserving prior
     * behavior.
     */
    protected async resolveSession(
        authorizationCode: OAuth2AuthorizationCode,
        options: OAuth2GrantRunWIthOptions,
    ) : Promise<Session> {
        if (authorizationCode.session_id) {
            const existing = await this.sessionManager.findOneById(authorizationCode.session_id);
            if (
                existing &&
                existing.sub === authorizationCode.sub &&
                existing.subKind === authorizationCode.sub_kind &&
                existing.realmId === authorizationCode.realm_id
            ) {
                // Write-once (plan 086): per-application attribution now lives
                // on the token row (`auth_session_tokens.client_id`), so this
                // column records the client that FIRST authorized on the
                // session. Overwriting made it last-writer-wins across every
                // app riding the IdP origin, where a session legitimately
                // serves several of them.
                if (!existing.clientId && authorizationCode.client_id) {
                    existing.clientId = authorizationCode.client_id;
                }

                return this.sessionManager.refresh(existing);
            }
        }

        return this.sessionManager.create({
            userAgent: options.userAgent,
            ipAddress: options.ipAddress,
            realmId: authorizationCode.realm_id,
            clientId: authorizationCode.client_id,
            subKind: authorizationCode.sub_kind,
            sub: authorizationCode.sub,
            authMethod: authorizationCode.auth_method ?? null,
        });
    }
}
