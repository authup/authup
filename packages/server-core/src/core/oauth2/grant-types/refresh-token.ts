/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { JWTError } from '@authup/specs';
import { buildOAuth2BearerTokenResponse } from '../response';
import type { IOAuth2TokenIssuer, IOAuth2TokenRevoker, IOAuth2TokenVerifier } from '../token';
import { OAuth2BaseGrant } from './base';
import type { IOAuth2Grant, OAuth2GrantRunWIthOptions, OAuth2RefreshTokenGrantContext } from './types';

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

        const session = await this.sessionManager.verify(payload.session_id);
        session.expires = new Date(
            Math.floor((this.refreshTokenIssuer.buildExp() + (3_600 * 24)) * 1_000),
        ).toISOString();
        if (options.userAgent) {
            session.user_agent = options.userAgent;
        }
        if (options.ipAddress) {
            session.ip_address = options.ipAddress;
        }

        await this.sessionManager.save(session);

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            ...payload,
            remote_address: session.ip_address,
            exp: this.accessTokenIssuer.buildExp(),
        });

        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue({
            ...payload,
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
