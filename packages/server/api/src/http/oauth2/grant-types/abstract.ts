/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/common';
import type { Continu } from 'continu';
import { useDataSource } from 'typeorm-extension';
import { OAuth2RefreshTokenEntity } from '../../../domains';
import type { Options, OptionsInput } from '../../../config';
import { useConfig } from '../../../config';
import {
    buildOAuth2AccessTokenPayload,
    transformToRefreshTokenEntity,
    transformToRefreshTokenPayload,
} from '../token';
import { OAuth2RefreshTokenCache } from '../cache';
import type { AccessTokenIssueContext } from './type';

export abstract class AbstractGrant {
    protected config : Continu<Options, OptionsInput>;

    protected refreshTokenCache : OAuth2RefreshTokenCache;

    // -----------------------------------------------------

    constructor() {
        this.config = useConfig();

        this.refreshTokenCache = new OAuth2RefreshTokenCache();
    }

    // -----------------------------------------------------

    protected async issueAccessToken(context: AccessTokenIssueContext) : Promise<Partial<OAuth2TokenPayload>> {
        return buildOAuth2AccessTokenPayload({
            issuer: this.config.get('publicUrl'),
            realmId: context.realmId,
            realmName: context.realmName,
            sub: context.sub,
            subKind: context.subKind,
            remoteAddress: context.remoteAddress,
            scope: context.scope,
            clientId: context.clientId,
        });
    }

    protected async issueRefreshToken(accessToken: Partial<OAuth2TokenPayload>) : Promise<Partial<OAuth2TokenPayload>> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);

        const token = repository.create(
            transformToRefreshTokenEntity(
                accessToken,
                this.config.get('tokenMaxAgeAccessToken'),
            ),
        );

        await repository.insert(token);

        await this.refreshTokenCache.set(token);

        return transformToRefreshTokenPayload(accessToken, {
            id: token.id,
        });
    }
}
