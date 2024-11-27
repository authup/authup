/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/schema';
import { OAuth2SubKind } from '@authup/schema';
import { useDataSource } from 'typeorm-extension';
import { OAuth2RefreshTokenEntity } from '../../../database/domains';
import type { Config } from '../../../config';
import { useConfig } from '../../../config';
import {
    OAuth2TokenManager,
    buildOAuth2AccessTokenPayload,
    buildOAuth2RefreshTokenPayload,
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
            maxAge: this.config.tokenAccessMaxAge,
        });

        return this.tokenManager.sign(raw);
    }

    protected async issueRefreshToken(
        accessToken: OAuth2TokenPayload,
    ) : Promise<TokenIssueResult> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);

        const entity = repository.create({
            client_id: accessToken.client_id,
            expires: new Date(Date.now() + (1000 * this.config.tokenRefreshMaxAge)).toISOString(),
            scope: accessToken.scope,
            access_token: accessToken.jti,
            realm_id: accessToken.realm_id,
            ...(accessToken.sub_kind === OAuth2SubKind.USER ? { user_id: accessToken.sub } : {}),
            ...(accessToken.sub_kind === OAuth2SubKind.ROBOT ? { robot_id: accessToken.sub } : {}),
        });

        await repository.insert(entity);

        const payload = buildOAuth2RefreshTokenPayload({
            issuer: accessToken.iss,
            remoteAddress: accessToken.remote_address,
            sub: accessToken.sub,
            subKind: accessToken.sub_kind,
            clientId: accessToken.client_id,
            realmId: accessToken.realm_id,
            realmName: accessToken.realm_name,
            scope: accessToken.scope,
            maxAge: this.config.tokenRefreshMaxAge,
        });

        payload.jti = entity.id;

        return this.tokenManager.sign(payload);
    }
}
