/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Scope, OAuth2SubKind, OAuth2TokenGrantResponse, UserError,
} from '@authelion/common';
import { NotFoundError } from '@typescript-error/http';
import { AbstractGrant } from './abstract';
import {
    Grant,
} from './type';
import { OAuth2BearerTokenResponse } from '../response';
import { ExpressRequest } from '../../http';
import { useDataSource } from '../../database';
import { UserRepository } from '../../domains';

export class InternalGrantType extends AbstractGrant implements Grant {
    async run(request: ExpressRequest): Promise<OAuth2TokenGrantResponse> {
        const dataSource = await useDataSource();
        const repository = new UserRepository(dataSource);

        const entity = await repository.findOneBy({
            id: request.userId,
        });

        if (!entity) {
            throw new NotFoundError();
        }

        if (!entity.active) {
            throw UserError.inactive();
        }

        const accessToken = await this.issueAccessToken({
            remoteAddress: request.ip,
            scope: OAuth2Scope.GLOBAL,
            realmId: request.realmId,
            sub: request.userId,
            subKind: OAuth2SubKind.USER,
            subName: entity.name,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            accessToken,
            refreshToken,
        });

        return response.build();
    }
}
