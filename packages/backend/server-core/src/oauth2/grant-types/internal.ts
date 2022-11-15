/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Scope, OAuth2SubKind, OAuth2TokenGrantResponse, Realm, User,
} from '@authelion/common';
import { Request, useRequestEnv } from 'routup';
import { AbstractGrant } from './abstract';
import {
    Grant,
} from './type';
import { OAuth2BearerTokenResponse } from '../response';

export class InternalGrantType extends AbstractGrant implements Grant {
    async run(request: Request): Promise<OAuth2TokenGrantResponse> {
        const accessToken = await this.issueAccessToken({
            remoteAddress: request.socket.remoteAddress, // todo: check if present
            scope: OAuth2Scope.GLOBAL,
            realmId: useRequestEnv(request, 'realmId') as Realm['id'],
            sub: useRequestEnv(request, 'userId') as User['id'],
            subKind: OAuth2SubKind.USER,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            accessToken,
            accessTokenMaxAge: this.config.tokenMaxAgeAccessToken,
            refreshToken,
        });

        return response.build();
    }
}
