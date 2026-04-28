/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { OAuth2SubKind } from '@authup/specs';
import type { Client, User } from '@authup/core-kit';
import {
    IdentityType,
    ScopeName,
} from '@authup/core-kit';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';
import type { IOAuth2TokenIssuer } from '../token/index.ts';
import { OAuth2BaseGrant } from './base.ts';
import type { OAuth2GrantRunWIthOptions, OAuth2PasswordGrantContext } from './types.ts';

export type OAuth2PasswordGrantInput = {
    user: User,
    client?: Client,
};

export class PasswordGrantType extends OAuth2BaseGrant<OAuth2PasswordGrantInput> {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    constructor(ctx: OAuth2PasswordGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
            sessionManager: ctx.sessionManager,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
    }

    async runWith(input: OAuth2PasswordGrantInput, options: OAuth2GrantRunWIthOptions = {}) : Promise<OAuth2TokenGrantResponse> {
        const { user, client } = input;
        const clientId = client?.id;

        const session = await this.sessionManager.create({
            user_agent: options.userAgent,
            ip_address: options.ipAddress,
            realm_id: user.realm_id,
            client_id: clientId,
            sub: user.id,
            sub_kind: IdentityType.USER,
        });

        const issuePayload : Partial<OAuth2TokenPayload> = {
            client_id: clientId,
            session_id: session.id,
            user_agent: session.user_agent,
            remote_address: session.ip_address,
            scope: ScopeName.GLOBAL,
            sub: user.id,
            sub_kind: OAuth2SubKind.USER,
            realm_id: user.realm_id,
            realm_name: user.realm?.name,
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
