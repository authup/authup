/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2ServerError,
    OAuth2TokenSubKind,
} from '@typescript-auth/domains';
import { AuthorizationHeaderType, parseAuthorizationHeader } from '@trapi/client';
import { Oauth2AccessTokenBuilder, Oauth2RefreshTokenBuilder } from '../token/builder';
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
            request: this.context.request,
            keyPairOptions: this.context.keyPairOptions,
            selfUrl: this.context.selfUrl,
            maxAge: typeof this.context.maxAge === 'number' ?
                this.context.maxAge :
                this.context.maxAge.access_token,
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

    protected async issueRefreshToken(data: OAuth2AccessTokenEntity) : Promise<OAuth2RefreshTokenEntity> {
        const tokenBuilder = new Oauth2RefreshTokenBuilder({
            accessToken: data,
            maxAge: typeof this.context.maxAge === 'number' ?
                // refresh_token should always live 3x lifespan of access-token,
                // if not specified otherwise
                (this.context.maxAge * 3) :
                this.context.maxAge.refresh_token,
        });

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
