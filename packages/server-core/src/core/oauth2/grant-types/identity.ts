/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import type { Identity } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import type { IOAuth2TokenIssuer } from '../token';
import { BaseGrant } from './base';
import { buildOAuth2BearerTokenResponse } from '../response';
import type { OAuth2IdentityGrantContext } from './types';

export class IdentityGrantType extends BaseGrant<Identity> {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    constructor(ctx: OAuth2IdentityGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
    }

    async runWith(
        identity: Identity,
        base: OAuth2TokenPayload = {},
    ): Promise<OAuth2TokenGrantResponse> {
        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            ...base,
            scope: ScopeName.GLOBAL,
            realm_id: identity.data.realm_id,
            realm_name: identity.data.realm?.name,
            sub: identity.data.id,
            sub_kind: identity.type,
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
