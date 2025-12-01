/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { buildOAuth2BearerTokenResponse } from '../response';
import { BaseGrant } from './base';
import type { IGrant } from './type';

export class RefreshTokenGrantType extends BaseGrant implements IGrant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const payload = await this.validate(request);

        await this.tokenRevoker.revoke(payload);

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            remote_address: getRequestIP(request, { trustProxy: true }),
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

    async validate(request: Request) : Promise<OAuth2TokenPayload> {
        const refreshToken = useRequestBody(request, 'refresh_token');

        return this.tokenVerifier.verify(refreshToken);
    }
}
