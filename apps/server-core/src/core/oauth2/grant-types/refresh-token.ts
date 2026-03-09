/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { JWTError } from '@authup/specs';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';
import type { IOAuth2TokenIssuer, IOAuth2TokenRevoker, IOAuth2TokenVerifier } from '../token/index.ts';
import { OAuth2BaseGrant } from './base.ts';
import type { IOAuth2Grant, OAuth2GrantRunWIthOptions, OAuth2RefreshTokenGrantContext } from './types.ts';

export class OAuth2RefreshTokenGrant extends OAuth2BaseGrant<string | OAuth2TokenPayload> implements IOAuth2Grant {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    protected tokenVerifier : IOAuth2TokenVerifier;

    protected tokenRevoker : IOAuth2TokenRevoker;

    constructor(ctx: OAuth2RefreshTokenGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
            sessionManager: ctx.sessionManager,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;

        this.tokenVerifier = ctx.tokenVerifier;
        this.tokenRevoker = ctx.tokenRevoker;
    }

    async runWith(
        input: string | OAuth2TokenPayload,
        options: OAuth2GrantRunWIthOptions = {},
    ) : Promise<OAuth2TokenGrantResponse> {
        let payload : OAuth2TokenPayload;
        if (typeof input === 'string') {
            payload = await this.tokenVerifier.verify(input);
        } else {
            payload = input;
        }

        await this.tokenRevoker.revoke(payload);

        if (!payload.session_id) {
            throw JWTError.payloadPropertyInvalid('session_id');
        }

        const session = await this.sessionManager.findOneById(payload.session_id);
        if (!session) {
            throw JWTError.payloadPropertyInvalid('session_id');
        }

        await this.sessionManager.verify(session);

        if (options.userAgent) {
            session.user_agent = options.userAgent;
        }
        if (options.ipAddress) {
            session.ip_address = options.ipAddress;
        }
        await this.sessionManager.refresh(session);

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            ...payload,
            user_agent: session.user_agent,
            remote_address: session.ip_address,
            exp: this.accessTokenIssuer.buildExp(),
        });

        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue({
            ...payload,
            user_agent: session.user_agent,
            remote_address: session.ip_address,
            exp: this.refreshTokenIssuer.buildExp(),
        });

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        });
    }
}
