/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2SubKind } from '@authup/specs';
import type { User } from '@authup/core-kit';
import {
    ScopeName,
} from '@authup/core-kit';
import { buildOAuth2BearerTokenResponse } from '../response';
import type { IOAuth2TokenIssuer } from '../token';
import { BaseGrant } from './base';
import type { OAuth2GrantRunWIthOptions, OAuth2PasswordGrantContext } from './types';

export class PasswordGrantType extends BaseGrant<User> {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    constructor(ctx: OAuth2PasswordGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
    }

    async runWith(input: User, options: OAuth2GrantRunWIthOptions = {}) : Promise<OAuth2TokenGrantResponse> {
        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            ...options,
            scope: ScopeName.GLOBAL,
            sub: input.id,
            sub_kind: OAuth2SubKind.USER,
            realm_id: input.realm_id,
            realm_name: input.realm?.name,
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
