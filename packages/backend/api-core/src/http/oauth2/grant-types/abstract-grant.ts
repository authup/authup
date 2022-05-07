/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2TokenSubKind,
    TokenError, determineAccessTokenMaxAge, determineRefreshTokenMaxAge,
} from '@authelion/common';
import { AuthorizationHeaderType, parseAuthorizationHeader } from '@trapi/client';
import { Cache, useClient } from 'redis-extension';
import path from 'path';
import { Oauth2AccessTokenBuilder, Oauth2RefreshTokenBuilder } from '../token';
import { GrantContext, IssueAccessTokenContext } from './type';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { CachePrefix } from '../../../config/constants';
import { useConfigSync } from '../../../config';

export abstract class AbstractGrant {
    protected context : GrantContext;

    protected accessTokenCache : Cache<string>;

    protected refreshTokenCache : Cache<string>;

    constructor(context: GrantContext) {
        context.config ??= useConfigSync();
        this.context = context;

        this.initCache();
    }

    // -----------------------------------------------------

    private initCache() {
        if (this.accessTokenCache || !this.context.config.redis.enabled) return;

        const redis = useClient(this.context.config.redis.alias);

        this.accessTokenCache = new Cache<string>({ redis }, { prefix: CachePrefix.TOKEN_ACCESS });
        this.refreshTokenCache = new Cache<string>({ redis }, { prefix: CachePrefix.TOKEN_REFRESH });
    }

    // -----------------------------------------------------

    protected async issueAccessToken(context: IssueAccessTokenContext) : Promise<OAuth2AccessTokenEntity> {
        const maxAge = determineAccessTokenMaxAge(this.context.config.tokenMaxAge);

        const tokenBuilder = new Oauth2AccessTokenBuilder({
            request: this.context.request,
            keyPairOptions: {
                directory: path.join(this.context.config.rootPath, this.context.config.writableDirectory),
            },
            selfUrl: this.context.config.selfUrl,
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

        const token = await tokenBuilder.create();

        if (this.accessTokenCache) {
            await this.accessTokenCache.set(token.id, token, { seconds: maxAge });
        }

        return token;
    }

    protected async issueRefreshToken(data: OAuth2AccessTokenEntity) : Promise<OAuth2RefreshTokenEntity> {
        const maxAge : number = determineRefreshTokenMaxAge(this.context.config.tokenMaxAge);

        const tokenBuilder = new Oauth2RefreshTokenBuilder({
            accessToken: data,
            maxAge,
        });

        const token = await tokenBuilder.create();

        if (this.refreshTokenCache) {
            await this.refreshTokenCache.set(token.id, token, { seconds: maxAge });
        }

        return token;
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
                throw TokenError.requestInvalid();
            }

            clientId = header.username;
            clientSecret = header.password;
        }

        return [clientId, clientSecret];
    }
}
