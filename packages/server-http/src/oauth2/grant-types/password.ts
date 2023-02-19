/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/common';
import {
    OAuth2SubKind, ScopeName,
    UserError,
    extractObjectProperty,
} from '@authup/common';
import { useRequestBody } from '@routup/body';
import type { Request } from 'routup';
import { getRequestIp, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import type { UserEntity } from '@authup/server-database';
import { UserRepository, resolveRealm } from '@authup/server-database';
import { AbstractGrant } from './abstract';
import { buildOAuth2BearerTokenResponse } from '../response';
import type { Grant } from './type';

export class PasswordGrantType extends AbstractGrant implements Grant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const user = await this.validate(request);

        const accessToken = await this.issueAccessToken({
            remoteAddress: getRequestIp(request, { trustProxy: true }),
            scope: ScopeName.GLOBAL,
            sub: user.id,
            subKind: OAuth2SubKind.USER,
            realmId: user.realm.id,
            realmName: user.realm.name,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenMaxAge: this.config.get('tokenMaxAgeAccessToken'),
            refreshToken,
        });
    }

    async validate(request: Request) : Promise<UserEntity> {
        const { username, password, realm_id: realmId } = useRequestBody(request);

        const realm = await resolveRealm(
            useRequestParam(request, 'realmId') || realmId,
        );

        const dataSource = await useDataSource();
        const repository = new UserRepository(dataSource);

        const entity = await repository.verifyCredentials(
            username,
            password,
            extractObjectProperty(realm, 'id'),
        );

        if (!entity) {
            throw UserError.credentialsInvalid();
        }

        if (!entity.active) {
            throw UserError.inactive();
        }

        return entity;
    }
}
