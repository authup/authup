/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2SubKind, OAuth2TokenGrantResponse } from '@authup/schema';
import { ScopeName } from '@authup/core-kit';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { useRequestIdentityOrFail } from '../../request';
import { AbstractGrant } from './abstract';
import type {
    Grant,
} from './type';
import { buildOAuth2BearerTokenResponse } from '../response';

export class InternalGrantType extends AbstractGrant implements Grant {
    async run(request: Request): Promise<OAuth2TokenGrantResponse> {
        const identity = useRequestIdentityOrFail(request);

        const {
            token: accessToken,
            payload: accessTokenPayload,
        } = await this.issueAccessToken({
            remoteAddress: getRequestIP(request, { trustProxy: true }),
            scope: ScopeName.GLOBAL,
            realmId: identity.realmId,
            realmName: identity.realmName,
            sub: identity.id,
            subKind: identity.type as `${OAuth2SubKind}`,
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
}
