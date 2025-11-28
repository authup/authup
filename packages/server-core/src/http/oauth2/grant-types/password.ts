/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2SubKind } from '@authup/specs';
import {
    ScopeName,
} from '@authup/core-kit';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import type {
    UserEntity,
} from '../../../database/domains';
import { UserAuthenticationService } from '../../../services';
import { buildOAuth2BearerTokenResponse } from '../response';
import { AbstractGrant } from './abstract';
import type { Grant } from './type';

export class PasswordGrantType extends AbstractGrant implements Grant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const user = await this.validate(request);

        const {
            token: accessToken,
            payload: accessTokenPayload,
        } = await this.issueAccessToken({
            remoteAddress: getRequestIP(request, { trustProxy: true }),
            scope: ScopeName.GLOBAL,
            sub: user.id,
            subKind: OAuth2SubKind.USER,
            realmId: user.realm.id,
            realmName: user.realm.name,
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

    async validate(request: Request) : Promise<UserEntity> {
        const {
            username,
            password,
            realm_id: realmId,
        } = useRequestBody(request);

        const authenticationService = new UserAuthenticationService({
            withLDAP: true,
        });

        return authenticationService.authenticate(username, password, realmId);
    }
}
