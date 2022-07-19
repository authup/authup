/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Scope, OAuth2SubKind,
    OAuth2TokenResponse,
    UserError,
} from '@authelion/common';
import { AbstractGrant } from './abstract';
import { UserEntity, UserRepository } from '../../domains';
import { OAuth2BearerTokenResponse } from '../response';
import { Grant } from './type';
import { useDataSource } from '../../database';
import { ExpressRequest } from '../../http';

export class PasswordGrantType extends AbstractGrant implements Grant {
    async run(request: ExpressRequest) : Promise<OAuth2TokenResponse> {
        const user = await this.validate(request);

        const accessToken = await this.issueAccessToken({
            remoteAddress: request.ip,
            scope: OAuth2Scope.GLOBAL,
            sub: user.id,
            subKind: OAuth2SubKind.USER,
            realmId: user.realm_id,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            accessToken,
            refreshToken,
            keyPairOptions: {
                directory: this.config.writableDirectoryPath,
            },
        });

        return response.build();
    }

    async validate(request: ExpressRequest) : Promise<UserEntity> {
        const { username, password } = request.body;

        const dataSource = await useDataSource();
        const repository = new UserRepository(dataSource);

        const entity = await repository.verifyCredentials(username, password);

        if (!entity) {
            throw UserError.credentialsInvalid();
        }

        if (!entity.active) {
            throw UserError.inactive();
        }

        return entity;
    }
}
