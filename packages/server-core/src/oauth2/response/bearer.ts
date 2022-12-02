/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2TokenGrantResponse,
    OAuth2TokenKind,
    OAuth2TokenPayload,
} from '@authelion/common';
import { signOAuth2TokenWithKey, useKey } from '@authelion/server-database';
import { OAuth2BearerResponseContext } from './type';

export class OAuth2BearerTokenResponse {
    protected context : OAuth2BearerResponseContext;

    // ------------------------------------------------

    constructor(context: OAuth2BearerResponseContext) {
        this.context = context;
    }

    // ------------------------------------------------

    async build() : Promise<OAuth2TokenGrantResponse> {
        const key = await useKey({ realm_id: this.context.accessToken.realm_id });

        const content = await signOAuth2TokenWithKey(
            this.context.accessToken,
            key,
            {
                keyid: key.id,
                expiresIn: this.context.accessTokenMaxAge,
            },
        );

        const response : OAuth2TokenGrantResponse = {
            access_token: content,
            expires_in: this.context.accessTokenMaxAge,
            token_type: 'Bearer',
            ...(this.context.accessToken.scope ? { scope: this.context.accessToken.scope } : {}),
        };

        if (this.context.idToken) {
            response.id_token = this.context.idToken;
        }

        if (this.context.refreshToken) {
            const refreshTokenPayload : Partial<OAuth2TokenPayload> = {
                jti: this.context.refreshToken.id,
                kind: OAuth2TokenKind.REFRESH,
                realm_id: this.context.accessToken.realm_id,
                sub: this.context.accessToken.sub,
                sub_kind: this.context.accessToken.sub_kind,
                scope: this.context.accessToken.scope,
                ...(this.context.accessToken.client_id ? { client_id: this.context.accessToken.client_id } : {}),
                ...(this.context.accessToken.scope ? { scope: this.context.accessToken.scope } : {}),
            };

            const key = await useKey({ realm_id: this.context.accessToken.realm_id });

            response.refresh_token = await signOAuth2TokenWithKey(
                refreshTokenPayload,
                key,
                {
                    keyid: key.id,
                    expiresIn: Math.ceil((this.context.refreshToken.expires.getTime() - Date.now()) / 1000),
                },
            );
        }

        return response;
    }
}
