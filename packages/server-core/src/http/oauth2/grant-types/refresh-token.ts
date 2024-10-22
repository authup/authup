/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/kit';
import { OAuth2SubKind, OAuth2TokenKind, TokenError } from '@authup/kit';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { OAuth2RefreshTokenEntity } from '../../../database/domains';
import { buildOAuth2BearerTokenResponse } from '../response';
import { AbstractGrant } from './abstract';
import type { Grant } from './type';

export class RefreshTokenGrantType extends AbstractGrant implements Grant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const token = await this.validate(request);

        const subKind = this.getSubjectKind(token);
        const sub = this.getSubject(token);

        const {
            token: accessToken,
            payload: accessTokenPayload,
        } = await this.issueAccessToken({
            remoteAddress: getRequestIP(request, { trustProxy: true }),
            scope: token.scope,
            sub,
            subKind,
            realmId: token.realm.id,
            realmName: token.realm.name,
        });

        const {
            token: refreshToken,
            payload: refreshTokenPayload,
        } = await this.issueRefreshToken(accessTokenPayload);

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        });
    }

    async validate(request: Request) : Promise<OAuth2RefreshTokenEntity> {
        const refreshToken = useRequestBody(request, 'refresh_token');

        const payload = await this.tokenManager.verify(refreshToken);

        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        const entity = await repository.findOne({
            where: {
                id: payload.jti,
            },
            relations: ['realm'],
        });

        if (!entity) {
            throw TokenError.tokenNotFound(OAuth2TokenKind.REFRESH);
        }

        const expires = Date.parse(entity.expires);
        if (expires < Date.now()) {
            throw TokenError.expired(OAuth2TokenKind.REFRESH);
        }

        await repository.remove(entity);
        await this.tokenManager.setInactive(refreshToken);

        return entity;
    }

    protected getSubject(entity: OAuth2RefreshTokenEntity) {
        if (entity.robot_id) {
            return entity.robot_id;
        }

        if (entity.user_id) {
            return entity.user_id;
        }

        if (entity.client_id) {
            return entity.client_id;
        }

        throw new SyntaxError('The subject could not be extracted from token entity.');
    }

    protected getSubjectKind(entity: OAuth2RefreshTokenEntity) : OAuth2SubKind {
        if (entity.robot_id) {
            return OAuth2SubKind.ROBOT;
        }

        if (entity.user_id) {
            return OAuth2SubKind.USER;
        }

        if (entity.client_id) {
            return OAuth2SubKind.CLIENT;
        }

        throw new SyntaxError('The subject kind could not be extracted from the token entity.');
    }
}
