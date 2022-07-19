/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2RefreshTokenPayload, OAuth2SubKind,
    OAuth2TokenKind,
    OAuth2TokenResponse,

} from '@authelion/common';
import { signToken } from '@authelion/server-utils';
import { OAuth2BearerResponseContext } from './type';

export class OAuth2BearerTokenResponse {
    protected context : OAuth2BearerResponseContext;

    // ------------------------------------------------

    constructor(context: OAuth2BearerResponseContext) {
        this.context = context;
    }

    // ------------------------------------------------

    async build() : Promise<OAuth2TokenResponse> {
        const response : OAuth2TokenResponse = {
            access_token: this.context.accessToken.content,
            expires_in: Math.ceil((this.context.accessToken.expires.getTime() - Date.now()) / 1000),
            token_type: 'Bearer',
            ...(this.context.accessToken.scope ? { scope: this.context.accessToken.scope } : {}),
        };

        if (this.context.idToken) {
            response.id_token = this.context.idToken;
        }

        if (this.context.refreshToken) {
            const refreshTokenPayload : Partial<OAuth2RefreshTokenPayload> = {
                kind: OAuth2TokenKind.REFRESH,
                realm_id: this.context.refreshToken.realm_id,
                refresh_token_id: this.context.refreshToken.id,
                access_token_id: this.context.accessToken.id,
                sub: this.context.accessToken.user_id || this.context.accessToken.robot_id,
                sub_kind: this.context.accessToken.user_id ?
                    OAuth2SubKind.USER :
                    OAuth2SubKind.ROBOT,
                ...(this.context.accessToken.client_id ? { client_id: this.context.accessToken.client_id } : {}),
                ...(this.context.accessToken.scope ? { scope: this.context.accessToken.scope } : {}),
            };

            const secondsDiff = Math.ceil((this.context.refreshToken.expires.getTime() - Date.now()) / 1000);

            response.refresh_token = await signToken(
                refreshTokenPayload,
                {
                    keyPair: this.context.keyPairOptions,
                    options: {
                        expiresIn: secondsDiff,
                    },
                },
            );
        }

        return response;
    }
}
