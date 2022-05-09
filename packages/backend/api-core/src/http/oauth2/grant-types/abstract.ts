/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2TokenSubKind,
    TokenError,
    determineAccessTokenMaxAge,
    determineRefreshTokenMaxAge,
} from '@authelion/common';
import { AuthorizationHeaderType, parseAuthorizationHeader } from '@trapi/client';
import path from 'path';
import { Oauth2AccessTokenBuilder, Oauth2RefreshTokenBuilder } from '../token';
import { AccessTokenIssueContext } from './type';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { Config } from '../../../config';
import { ExpressRequest } from '../../type';

export abstract class AbstractGrant {
    protected config : Config;

    constructor(config: Config) {
        this.config = config;
    }

    // -----------------------------------------------------

    protected async issueAccessToken(context: AccessTokenIssueContext) : Promise<OAuth2AccessTokenEntity> {
        const maxAge = determineAccessTokenMaxAge(this.config.tokenMaxAge);

        const tokenBuilder = new Oauth2AccessTokenBuilder({
            request: context.request,
            keyPairOptions: {
                directory: path.join(this.config.rootPath, this.config.writableDirectory),
            },
            selfUrl: this.config.selfUrl,
            maxAge,
        });

        tokenBuilder.setRealm(context.realm);

        switch (context.entity.kind) {
            case OAuth2TokenSubKind.ROBOT:
                tokenBuilder.setRobot(context.entity.data);
                break;
            case OAuth2TokenSubKind.USER:
                tokenBuilder.setUser(context.entity.data);
                break;
        }

        tokenBuilder.setClient(context.client);

        if (context.scope) {
            tokenBuilder.addScope(context.scope);
        }

        return tokenBuilder.create();
    }

    protected async issueRefreshToken(accessToken: OAuth2AccessTokenEntity) : Promise<OAuth2RefreshTokenEntity> {
        const maxAge : number = determineRefreshTokenMaxAge(this.config.tokenMaxAge);

        const tokenBuilder = new Oauth2RefreshTokenBuilder({
            accessToken,
            maxAge,
        });

        return tokenBuilder.create();
    }

    // -----------------------------------------------------

    protected getClientCredentials(request: ExpressRequest) : [string, string] {
        let { client_id: clientId, client_secret: clientSecret } = request.body;

        if (
            !clientId &&
            !clientSecret
        ) {
            const { authorization: headerValue } = request.headers;

            const header = parseAuthorizationHeader(headerValue);

            if (header.type !== AuthorizationHeaderType.BASIC) {
                throw TokenError.requestInvalid();
            }

            clientId = header.username;
            clientSecret = header.password;
        }

        return [clientId, clientSecret];
    }
}
