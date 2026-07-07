/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { hasOAuth2Scopes } from '@authup/specs';
import type { OAuth2AuthorizationCode, Session } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import type { IOAuth2TokenIssuer } from '../token/index.ts';
import { OAuth2BaseGrant } from './base.ts';
import type { IOAuth2Grant, OAuth2AuthorizeGrantContext, OAuth2GrantRunWIthOptions } from './types.ts';
import type { OAuth2BearerResponseBuildContext } from '../response/index.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';

export class OAuth2AuthorizeGrant extends OAuth2BaseGrant<OAuth2AuthorizationCode> implements IOAuth2Grant {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    constructor(ctx: OAuth2AuthorizeGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
            sessionManager: ctx.sessionManager,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
    }

    async runWith(
        authorizationCode: OAuth2AuthorizationCode,
        options: OAuth2GrantRunWIthOptions = {},
    ) : Promise<OAuth2TokenGrantResponse> {
        const session = await this.resolveSession(authorizationCode, options);

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
        };

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue(issuePayload);
        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(issuePayload);

        const buildContext : OAuth2BearerResponseBuildContext = {
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        };

        if (
            authorizationCode.scope &&
            hasOAuth2Scopes(authorizationCode.scope, ScopeName.OPEN_ID)
        ) {
            buildContext.idToken = authorizationCode.id_token || undefined;
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
                existing.sub_kind === authorizationCode.sub_kind &&
                existing.realm_id === authorizationCode.realm_id
            ) {
                existing.client_id = authorizationCode.client_id || null;

                return this.sessionManager.refresh(existing);
            }
        }

        return this.sessionManager.create({
            user_agent: options.userAgent,
            ip_address: options.ipAddress,
            realm_id: authorizationCode.realm_id,
            client_id: authorizationCode.client_id,
            sub_kind: authorizationCode.sub_kind,
            sub: authorizationCode.sub,
        });
    }
}
