/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/kit';
import { extractTokenPayload } from '@authup/server-kit';
import { useDataSource } from 'typeorm-extension';
import { OAuth2RefreshTokenEntity, signOAuth2TokenWithKey, useKey } from '../../../domains';
import type { Config } from '../../../config';
import { useConfig } from '../../../config';
import {
    buildOAuth2AccessTokenPayload,
    transformToRefreshTokenEntity,
    transformToRefreshTokenPayload,
} from '../token';
import type { AccessTokenIssueContext, TokenIssueResult } from './type';

export abstract class AbstractGrant {
    protected config : Config;

    // protected cache : OAuth2Cache;

    // -----------------------------------------------------

    constructor() {
        this.config = useConfig();

        // this.cache = useOAuth2Cache();
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
        if (raw.exp) {
            raw.exp = Math.floor(new Date().getTime() / 1000) + this.config.tokenAccessMaxAge;
        }

        return this.issueToken(raw);
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
        if (raw.exp) {
            raw.exp = Math.floor(new Date().getTime() / 1000) + this.config.tokenRefreshMaxAge;
        }

        return this.issueToken(raw);
    }

    // -----------------------------------------------------

    private async issueToken(raw: Partial<OAuth2TokenPayload>) : Promise<TokenIssueResult> {
        const key = await useKey({
            realm_id: raw.realm_id,
        });

        const token = await signOAuth2TokenWithKey(raw, key, { keyId: key.id });
        const payload = extractTokenPayload(token) as OAuth2TokenPayload;

        // await this.cache.setTokenID(token, payload.jti);
        // await this.cache.setTokenPayload(payload);

        return {
            token,
            payload,
        };
    }
}
