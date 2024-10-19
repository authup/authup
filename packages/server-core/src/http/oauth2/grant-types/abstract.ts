/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/kit';
import { useDataSource } from 'typeorm-extension';
import { OAuth2RefreshTokenEntity } from '../../../domains';
import type { Config } from '../../../config';
import { useConfig } from '../../../config';
import {
    OAuth2TokenManager, buildOAuth2AccessTokenPayload,
    transformToRefreshTokenEntity,
    transformToRefreshTokenPayload,
} from '../token';
import type { AccessTokenIssueContext, TokenIssueResult } from './type';

export abstract class AbstractGrant {
    protected config : Config;

    protected tokenManager : OAuth2TokenManager;

    // -----------------------------------------------------

    constructor() {
        this.config = useConfig();

        this.tokenManager = new OAuth2TokenManager();
    }

    // -----------------------------------------------------

    protected async issueAccessToken(
        context: AccessTokenIssueContext,
    ) : Promise<TokenIssueResult> {
        const raw = buildOAuth2AccessTokenPayload({
            issuer: this.config.publicUrl,
            realmId: context.realmId,
            realmName: context.realmName,
            sub: context.sub,
            subKind: context.subKind,
            remoteAddress: context.remoteAddress,
            scope: context.scope,
            clientId: context.clientId,
        });

        return this.tokenManager.sign(raw);
    }

    protected async issueRefreshToken(
        accessToken: OAuth2TokenPayload,
    ) : Promise<TokenIssueResult> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);

        const entity = repository.create(
            transformToRefreshTokenEntity(
                accessToken,
                this.config.tokenRefreshMaxAge,
            ),
        );

        await repository.insert(entity);

        const raw = transformToRefreshTokenPayload(accessToken, {
            id: entity.id,
        });

        return this.tokenManager.sign(raw);
    }
}
