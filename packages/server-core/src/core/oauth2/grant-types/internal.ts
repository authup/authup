/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2SubKind, OAuth2TokenGrantResponse } from '@authup/specs';
import { ScopeName } from '@authup/core-kit';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { useRequestIdentityOrFail } from '../../../http/request';
import { BaseGrant } from './base';
import type {
    IGrant,
} from './type';
import { buildOAuth2BearerTokenResponse } from '../response';

export class InternalGrantType extends BaseGrant implements IGrant {
    async run(request: Request): Promise<OAuth2TokenGrantResponse> {
        const identity = useRequestIdentityOrFail(request);

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            remote_address: getRequestIP(request, { trustProxy: true }),
            scope: ScopeName.GLOBAL,
            realm_id: identity.realmId,
            realm_name: identity.realmName,
            sub: identity.id,
            sub_kind: identity.type as `${OAuth2SubKind}`,
        });

        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(accessTokenPayload);

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        });
    }
}
