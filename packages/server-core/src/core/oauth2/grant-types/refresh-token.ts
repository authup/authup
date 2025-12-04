/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { buildOAuth2BearerTokenResponse } from '../response';
import type { IOAuth2TokenIssuer, IOAuth2TokenRevoker, IOAuth2TokenVerifier } from '../token';
import { BaseGrant } from './base';
import type { IOAuth2Grant, OAuth2RefreshTokenGrantContext } from './types';

export class OAuth2RefreshTokenGrant extends BaseGrant<string | OAuth2TokenPayload> implements IOAuth2Grant {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    protected tokenVerifier : IOAuth2TokenVerifier;

    protected tokenRevoker : IOAuth2TokenRevoker;

    constructor(ctx: OAuth2RefreshTokenGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;

        this.tokenVerifier = ctx.tokenVerifier;
        this.tokenRevoker = ctx.tokenRevoker;
    }

    async runWith(
        input: string | OAuth2TokenPayload,
        base: OAuth2TokenPayload = {},
    ) : Promise<OAuth2TokenGrantResponse> {
        let payload : OAuth2TokenPayload;
        if (typeof input === 'string') {
            payload = await this.tokenVerifier.verify(input);
        } else {
            payload = input;
        }

        await this.tokenRevoker.revoke(payload);

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            ...base,
            ...payload,
        });

        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(accessTokenPayload);

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        });
    }
}
