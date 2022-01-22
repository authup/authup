/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AccessTokenSubKind,
    OAuth2RefreshTokenPayload,
    OAuth2TokenKind,
    Oauth2TokenResponse,
} from '@typescript-auth/domains';
import { OAuth2BearerResponseContext } from './type';
import { signToken } from '../../../utils';

export class OAuth2BearerTokenResponse {
    protected context : OAuth2BearerResponseContext;

    // ------------------------------------------------

    constructor(context: OAuth2BearerResponseContext) {
        this.context = context;
    }

    // ------------------------------------------------

    async build() : Promise<Oauth2TokenResponse> {
        const response : Oauth2TokenResponse = {
            access_token: this.context.accessToken.token,
            expires_in: Math.ceil((this.context.accessToken.expires.getTime() - Date.now()) / 1000),
            token_type: 'bearer',
            ...(this.context.accessToken.scope ? { scope: this.context.accessToken.scope } : {}),
        };

        if (this.context.refreshToken) {
            const refreshTokenPayload : Partial<OAuth2RefreshTokenPayload> = {
                kind: OAuth2TokenKind.REFRESH,
                client_id: this.context.accessToken.client_id,
                refresh_token_id: this.context.refreshToken.id,
                access_token_id: this.context.accessToken.id,
                sub: this.context.accessToken.user_id || this.context.accessToken.robot_id,
                sub_kind: this.context.accessToken.user_id ?
                    OAuth2AccessTokenSubKind.USER :
                    OAuth2AccessTokenSubKind.ROBOT,
                ...(this.context.accessToken.scope ? { scope: this.context.accessToken.scope } : {}),
            };

            const secondsDiff = Math.ceil((this.context.refreshToken.expires.getTime() - Date.now()) / 1000);

            response.refresh_token = await signToken(
                refreshTokenPayload,
                secondsDiff,
                this.context.keyPairOptions,
            );
        }

        return response;
    }
}
