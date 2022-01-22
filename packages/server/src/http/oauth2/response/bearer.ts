/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { constants, privateEncrypt, publicEncrypt } from 'crypto';
import { Buffer } from 'buffer';
import { OAuth2AccessTokenSubKind, OAuth2RefreshTokenPayload, Oauth2TokenResponse } from '@typescript-auth/domains';
import { OAuth2BearerResponseContext } from './type';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import {
    KeyPairOptions, SecurityKeyPair, signToken, useKeyPair,
} from '../../../utils';

export class OAuth2BearerTokenResponse {
    protected accessToken : OAuth2AccessTokenEntity;

    protected refreshToken?: OAuth2RefreshTokenEntity;

    protected securityKeyPairOptions?: Partial<KeyPairOptions>;

    // ------------------------------------------------

    constructor(context: OAuth2BearerResponseContext) {
        this.accessToken = context.accessToken;
        this.refreshToken = context.refreshToken;
        this.securityKeyPairOptions = context.keyPairOptions;
    }

    // ------------------------------------------------

    async build() : Promise<Oauth2TokenResponse> {
        const response : Oauth2TokenResponse = {
            access_token: this.accessToken.token,
            expires_in: Math.ceil((this.accessToken.expires.getTime() - Date.now()) / 1000),
            token_type: 'bearer',
            ...(this.accessToken.scope ? { scope: this.accessToken.scope } : {}),
        };

        if (this.refreshToken) {
            const refreshTokenPayload : OAuth2RefreshTokenPayload = {
                client_id: this.accessToken.client_id,
                refresh_token_id: this.refreshToken.id,
                access_token_id: this.accessToken.id,
                scope: this.accessToken.scope,
                expire_time: this.refreshToken.expires.getTime(),
                sub: this.accessToken.user_id || this.accessToken.robot_id,
                sub_kind: this.accessToken.user_id ?
                    OAuth2AccessTokenSubKind.USER :
                    OAuth2AccessTokenSubKind.ROBOT,
            };

            /*

            const keyPair : SecurityKeyPair = await useKeyPair(this.securityKeyPairOptions);

            const buffer : Buffer = Buffer.from(JSON.stringify(refreshTokenPayload));

            const encryptionBuffer = publicEncrypt(keyPair.publicKey, buffer);

            response.refresh_token = encryptionBuffer.toString('hex');
             */

            const secondsDiff = Math.ceil((this.refreshToken.expires.getTime() - Date.now()) / 1000);

            response.refresh_token = await signToken(refreshTokenPayload, secondsDiff, this.securityKeyPairOptions);
        }

        return response;
    }
}
