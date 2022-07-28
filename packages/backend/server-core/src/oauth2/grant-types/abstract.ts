/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Oauth2AccessTokenBuilder, Oauth2RefreshTokenBuilder } from '../builder';
import { AccessTokenIssueContext } from './type';
import { OAuth2AccessTokenEntity, OAuth2RefreshTokenEntity } from '../../domains';
import { Config } from '../../config';
import { OAuth2AccessTokenCache, OAuth2RefreshTokenCache } from '../cache';

export abstract class AbstractGrant {
    protected config : Config;

    protected accessTokenCache : OAuth2AccessTokenCache;

    protected refreshTokenCache : OAuth2RefreshTokenCache;

    // -----------------------------------------------------

    constructor(config: Config) {
        this.config = config;

        this.accessTokenCache = new OAuth2AccessTokenCache();
        this.refreshTokenCache = new OAuth2RefreshTokenCache();
    }

    // -----------------------------------------------------

    protected async issueAccessToken(context: AccessTokenIssueContext) : Promise<OAuth2AccessTokenEntity> {
        const tokenBuilder = new Oauth2AccessTokenBuilder({
            selfUrl: this.config.selfUrl,
            maxAge: this.config.tokenMaxAgeAccessToken,
        });

        const token = await tokenBuilder.create({
            realmId: context.realmId,
            sub: context.sub,
            subKind: context.subKind,
            subName: context.subName,
            remoteAddress: context.remoteAddress,
            scope: context.scope,
            clientId: context.clientId,
        });

        await this.accessTokenCache.set(token);

        return token;
    }

    protected async issueRefreshToken(accessToken: OAuth2AccessTokenEntity) : Promise<OAuth2RefreshTokenEntity> {
        const tokenBuilder = new Oauth2RefreshTokenBuilder({
            maxAge: this.config.tokenMaxAgeRefreshToken,
        });

        const token = await tokenBuilder.create({ accessToken });

        await this.refreshTokenCache.set(token);

        return token;
    }
}
