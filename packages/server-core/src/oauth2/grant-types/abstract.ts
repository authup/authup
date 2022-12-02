/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenPayload } from '@authelion/common';
import { Config } from '@authelion/server-common';
import { OAuth2RefreshTokenEntity } from '@authelion/server-database';
import { Options, OptionsInput, useConfig } from '../../config';
import { Oauth2AccessTokenBuilder, Oauth2RefreshTokenBuilder } from '../builder';
import { OAuth2RefreshTokenCache } from '../cache';
import { AccessTokenIssueContext } from './type';

export abstract class AbstractGrant {
    protected config : Config<Options, OptionsInput>;

    protected refreshTokenCache : OAuth2RefreshTokenCache;

    // -----------------------------------------------------

    constructor() {
        this.config = useConfig();

        this.refreshTokenCache = new OAuth2RefreshTokenCache();
    }

    // -----------------------------------------------------

    protected async issueAccessToken(context: AccessTokenIssueContext) : Promise<Partial<OAuth2TokenPayload>> {
        const tokenBuilder = new Oauth2AccessTokenBuilder({
            selfUrl: this.config.get('selfUrl'),
            maxAge: this.config.get('tokenMaxAgeAccessToken'),
        });

        return tokenBuilder.create({
            realmId: context.realmId,
            sub: context.sub,
            subKind: context.subKind,
            remoteAddress: context.remoteAddress,
            scope: context.scope,
            clientId: context.clientId,
        });
    }

    protected async issueRefreshToken(accessToken: Partial<OAuth2TokenPayload>) : Promise<OAuth2RefreshTokenEntity> {
        const tokenBuilder = new Oauth2RefreshTokenBuilder({
            maxAge: this.config.get('tokenMaxAgeRefreshToken'),
        });

        const token = await tokenBuilder.create({ accessToken });

        await this.refreshTokenCache.set(token);

        return token;
    }
}
