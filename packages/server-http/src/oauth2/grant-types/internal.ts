/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2SubKind, OAuth2TokenGrantResponse, Realm, ScopeName, User,
} from '@authup/common';
import { Request, getRequestIp } from 'routup';
import { useRequestEnv } from '../../utils';
import { AbstractGrant } from './abstract';
import {
    Grant,
} from './type';
import { buildOAuth2BearerTokenResponse } from '../response';

export class InternalGrantType extends AbstractGrant implements Grant {
    async run(request: Request): Promise<OAuth2TokenGrantResponse> {
        const realm = useRequestEnv(request, 'realm');
        const accessToken = await this.issueAccessToken({
            remoteAddress: getRequestIp(request, { trustProxy: true }),
            scope: ScopeName.GLOBAL,
            realmId: realm.id,
            realmName: realm.name,
            sub: useRequestEnv(request, 'userId') as User['id'],
            subKind: OAuth2SubKind.USER,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenMaxAge: this.config.get('tokenMaxAgeAccessToken'),
            refreshToken,
        });
    }
}
