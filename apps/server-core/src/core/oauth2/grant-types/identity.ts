/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import type { Identity, Session } from '@authup/core-kit';
import { ScopeName, SessionAuthMethod } from '@authup/core-kit';
import type { IOAuth2TokenIssuer } from '../token/index.ts';
import { OAuth2BaseGrant } from './base.ts';
import { deriveAmrAcr } from '../authorization/helpers.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';
import type { OAuth2GrantRunWIthOptions, OAuth2IdentityGrantContext } from './types.ts';

export class IdentityGrantType extends OAuth2BaseGrant<Identity> {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    constructor(ctx: OAuth2IdentityGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
            sessionManager: ctx.sessionManager,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
    }

    async runWith(
        identity: Identity,
        options: OAuth2GrantRunWIthOptions = {},
    ): Promise<OAuth2TokenGrantResponse> {
        const session : Partial<Session> = {
            userAgent: options.userAgent,
            ipAddress: options.ipAddress,
            realmId: identity.data.realmId,
            sub: identity.data.id,
            subKind: identity.type,
            authMethod: SessionAuthMethod.EXTERNAL,
        };

        const { id: sessionId } = await this.sessionManager.create(session);

        // amr/acr derive from the session's authMethod + mfaAt — deliberately
        // on every token kind, so a direct identity grant's tokens advertise the
        // (external) method the same way the authorization_code exchange does.
        const amrAcr = deriveAmrAcr({
            authMethod: session.authMethod ?? null,
            mfaAt: session.mfaAt ?? null,
        });

        const issuePayload : Partial<OAuth2TokenPayload> = {
            session_id: sessionId,
            user_agent: session.userAgent,
            remote_address: session.ipAddress,
            scope: ScopeName.GLOBAL,
            realm_id: identity.data.realmId,
            realm_name: identity.data.realm?.name,
            sub: identity.data.id,
            sub_kind: identity.type,
            ...amrAcr,
        };

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue(issuePayload);
        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(issuePayload);

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        });
    }
}
