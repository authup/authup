/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import type { Identity, Session } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import type { IOAuth2TokenIssuer } from '../token';
import { OAuth2BaseGrant } from './base';
import { buildOAuth2BearerTokenResponse } from '../response';
import type { OAuth2GrantRunWIthOptions, OAuth2IdentityGrantContext } from './types';

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
            user_agent: options.userAgent,
            ip_address: options.ipAddress,
            realm_id: identity.data.realm_id,
            sub: identity.data.id,
            sub_kind: identity.type,
        };

        const { id: sessionId } = await this.sessionManager.create(session);

        const issuePayload : Partial<OAuth2TokenPayload> = {
            session_id: sessionId,
            user_agent: session.user_agent,
            remote_address: session.ip_address,
            scope: ScopeName.GLOBAL,
            realm_id: identity.data.realm_id,
            realm_name: identity.data.realm?.name,
            sub: identity.data.id,
            sub_kind: identity.type,
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
