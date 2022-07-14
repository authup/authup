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
import { Cache, useClient } from 'redis-extension';
import { AuthorizationHeaderType, parseAuthorizationHeader } from '@trapi/client';
import { Oauth2AccessTokenBuilder, Oauth2RefreshTokenBuilder } from '../token';
import { AccessTokenIssueContext } from './type';
import { OAuth2AccessTokenEntity, OAuth2RefreshTokenEntity } from '../../../domains';
import { Config } from '../../../config';
import { ExpressRequest } from '../../type';
import { CachePrefix } from '../../../constants';
import { isRedisEnabled } from '../../../utils';

export abstract class AbstractGrant {
    protected config : Config;

    protected accessTokenCache : Cache<string>;

    protected refreshTokenCache : Cache<string>;

    // -----------------------------------------------------

    constructor(config: Config) {
        this.config = config;

        if (isRedisEnabled(this.config.redis)) {
            const redis = useClient();

            this.accessTokenCache = new Cache<string>({ redis }, { prefix: CachePrefix.OAUTH2_ACCESS_TOKEN });
            this.refreshTokenCache = new Cache<string>({ redis }, { prefix: CachePrefix.OAUTH2_REFRESH_TOKEN });
        }
    }

    // -----------------------------------------------------

    protected async issueAccessToken(context: AccessTokenIssueContext) : Promise<OAuth2AccessTokenEntity> {
        const maxAge = determineAccessTokenMaxAge(this.config.tokenMaxAge);

        const tokenBuilder = new Oauth2AccessTokenBuilder({
            request: context.request,
            keyPairOptions: {
                directory: this.config.writableDirectoryPath,
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

        const token = await tokenBuilder.create();

        if (this.accessTokenCache) {
            await this.accessTokenCache.set(token.id, token, { seconds: maxAge });
        }

        return token;
    }

    protected async issueRefreshToken(accessToken: OAuth2AccessTokenEntity) : Promise<OAuth2RefreshTokenEntity> {
        const maxAge : number = determineRefreshTokenMaxAge(this.config.tokenMaxAge);

        const tokenBuilder = new Oauth2RefreshTokenBuilder({
            accessToken,
            maxAge,
        });

        const token = await tokenBuilder.create();

        if (this.refreshTokenCache) {
            await this.refreshTokenCache.set(token.id, token, { seconds: maxAge });
        }

        return token;
    }

    // -----------------------------------------------------

    protected getClientCredentials(request: ExpressRequest) : [string, string] {
        let { client_id: clientId, client_secret: clientSecret } = request.body;

        if (!clientId && !clientSecret) {
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
