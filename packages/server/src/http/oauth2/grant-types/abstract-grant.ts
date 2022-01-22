/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AccessTokenSubKind,
    OAuth2ServerError,
} from '@typescript-auth/domains';
import { AuthorizationHeaderType, parseAuthorizationHeader } from '@trapi/client';
import { Oauth2AccessTokenBuilder, Oauth2RefreshTokenBuilder } from '../builder';
import { GrantContext, IssueAccessTokenContext } from './type';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';

export abstract class AbstractGrant {
    protected context : GrantContext;

    constructor(context: GrantContext) {
        context.maxAge = context.maxAge || 3600;

        this.context = context;
    }

    // -----------------------------------------------------

    protected async issueAccessToken(context: IssueAccessTokenContext) : Promise<OAuth2AccessTokenEntity> {
        const tokenBuilder = new Oauth2AccessTokenBuilder({
            ...this.context,
        });

        switch (context.entity.type) {
            case OAuth2AccessTokenSubKind.ROBOT:
                tokenBuilder.setRobot(context.entity.data);
                break;
            case OAuth2AccessTokenSubKind.USER:
                tokenBuilder.setUser(context.entity.data);
                break;
        }

        tokenBuilder.setClient(context.client);

        if (context.scope) {
            tokenBuilder.addScope(context.scope);
        }

        const expireDate : Date = new Date(Date.now() + (1000 * this.context.maxAge));
        tokenBuilder.setExpireDate(expireDate);

        return tokenBuilder.create();
    }

    protected async issueRefreshToken(data: OAuth2AccessTokenEntity) : Promise<OAuth2RefreshTokenEntity> {
        const tokenBuilder = new Oauth2RefreshTokenBuilder(data);

        const expireDate : Date = new Date(Date.now() + (1000 * this.context.maxAge));
        tokenBuilder.setExpireDate(expireDate);

        return tokenBuilder.create();
    }

    // -----------------------------------------------------

    protected getClientCredentials() : [string, string] {
        let { client_id: clientId, client_secret: clientSecret } = this.context.request.body;

        if (
            !clientId &&
            !clientSecret
        ) {
            const { authorization: headerValue } = this.context.request.headers;

            const header = parseAuthorizationHeader(headerValue);

            if (header.type !== AuthorizationHeaderType.BASIC) {
                throw OAuth2ServerError.invalidRequest();
            }

            clientId = header.username;
            clientSecret = header.password;
        }

        return [clientId, clientSecret];
    }
}
