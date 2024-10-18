/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/kit';
import {
    OAuth2SubKind, TokenError,
} from '@authup/kit';
import {
    hasOAuth2OpenIDScope,
} from '@authup/core-kit';
import { useRequestBody } from '@routup/basic/body';
import { useRequestQuery } from '@routup/basic/query';
import { useDataSource } from 'typeorm-extension';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { OAuth2AuthorizationCodeEntity } from '../../../domains';
import { AbstractGrant } from './abstract';
import type { Grant } from './type';
import type { OAuth2BearerResponseBuildContext } from '../response';
import { buildOAuth2BearerTokenResponse } from '../response';

export class AuthorizeGrantType extends AbstractGrant implements Grant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const authorizationCode = await this.validate(request);

        const {
            payload: accessTokenPayload,
            token: accessToken,
        } = await this.issueAccessToken({
            remoteAddress: getRequestIP(request, { trustProxy: true }),
            sub: authorizationCode.user_id,
            subKind: OAuth2SubKind.USER,
            realmId: authorizationCode.realm.id,
            realmName: authorizationCode.realm.name,
            scope: authorizationCode.scope,
            clientId: authorizationCode.client_id,
        });

        const {
            token: refreshToken,
            payload: refreshTokenPayload,
        } = await this.issueRefreshToken(accessTokenPayload);

        const buildContext : OAuth2BearerResponseBuildContext = {
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        };

        if (hasOAuth2OpenIDScope(authorizationCode.scope)) {
            buildContext.idToken = authorizationCode.id_token;
        }

        return buildOAuth2BearerTokenResponse(buildContext);
    }

    async validate(request: Request) : Promise<OAuth2AuthorizationCodeEntity> {
        const code = this.getAuthorizationCode(request);

        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);

        const entity = await repository.findOne({
            where: {
                content: code,
            },
            relations: ['user', 'realm'],
        });

        if (!entity) {
            throw TokenError.grantInvalid();
        }

        if (entity.redirect_uri) {
            const redirectUri = this.getRedirectURI(request);

            if (!redirectUri || entity.redirect_uri !== redirectUri) {
                throw TokenError.redirectUriMismatch();
            }
        }

        await repository.remove(entity);

        return entity;
    }

    protected getAuthorizationCode(request: Request) : string {
        let code = useRequestBody(request, 'code');

        if (!code) {
            code = useRequestQuery(request, 'code');
        }

        if (!code || typeof code !== 'string') {
            throw TokenError.requestInvalid();
        }

        return code;
    }

    protected getRedirectURI(request: Request) : string {
        let redirectUri = useRequestBody(request, 'redirect_uri');

        if (!redirectUri) {
            redirectUri = useRequestQuery(request, 'redirect_uri');
        }

        if (!redirectUri || typeof redirectUri !== 'string') {
            throw TokenError.redirectUriMismatch();
        }

        return redirectUri;
    }
}
