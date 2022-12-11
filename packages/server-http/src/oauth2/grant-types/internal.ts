/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Scope, OAuth2SubKind, OAuth2TokenGrantResponse, Realm, User,
} from '@authup/common';
import { Request, getRequestIp } from 'routup';
import { useRequestEnv } from '../../utils';
import { AbstractGrant } from './abstract';
import {
    Grant,
} from './type';
import { OAuth2BearerTokenResponse } from '../response';

export class InternalGrantType extends AbstractGrant implements Grant {
    async run(request: Request): Promise<OAuth2TokenGrantResponse> {
        const realm = useRequestEnv(request, 'realm');
        const accessToken = await this.issueAccessToken({
            remoteAddress: getRequestIp(request, { trustProxy: true }),
            scope: OAuth2Scope.GLOBAL,
            realmId: realm.id,
            realmName: realm.name,
            sub: useRequestEnv(request, 'userId') as User['id'],
            subKind: OAuth2SubKind.USER,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            accessToken,
            accessTokenMaxAge: this.config.get('tokenMaxAgeAccessToken'),
            refreshToken,
        });

        return response.build();
    }
}
