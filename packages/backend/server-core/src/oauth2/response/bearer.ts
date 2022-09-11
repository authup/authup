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
    getOAuth2SubByEntity,
    getOAuth2SubKindByEntity,
} from '@authelion/common';
import { OAuth2BearerResponseContext } from './type';
import { signOAuth2TokenWithKey, useKey } from '../../domains';

export class OAuth2BearerTokenResponse {
    protected context : OAuth2BearerResponseContext;

    // ------------------------------------------------

    constructor(context: OAuth2BearerResponseContext) {
        this.context = context;
    }

    // ------------------------------------------------

    async build() : Promise<OAuth2TokenGrantResponse> {
        const response : OAuth2TokenGrantResponse = {
            access_token: this.context.accessToken.content,
            expires_in: Math.ceil((this.context.accessToken.expires.getTime() - Date.now()) / 1000),
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
                realm_id: this.context.refreshToken.realm_id,
                sub: getOAuth2SubByEntity(this.context.accessToken),
                sub_kind: getOAuth2SubKindByEntity(this.context.accessToken),
                scope: this.context.accessToken.scope,
                ...(this.context.accessToken.client_id ? { client_id: this.context.accessToken.client_id } : {}),
                ...(this.context.accessToken.scope ? { scope: this.context.accessToken.scope } : {}),
            };

            const key = await useKey({ realm_id: this.context.refreshToken.realm_id });
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
