/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import {
    hasOAuth2Scopes,
} from '@authup/specs';
import type { OAuth2AuthorizationCode } from '@authup/core-kit';
import {
    ScopeName,
} from '@authup/core-kit';
import type { IOAuth2TokenIssuer } from '../token';
import { BaseGrant } from './base';
import type { IOAuth2Grant, OAuth2AuthorizeGrantContext } from './types';
import type { OAuth2BearerResponseBuildContext } from '../response';
import { buildOAuth2BearerTokenResponse } from '../response';

export class OAuth2AuthorizeGrant extends BaseGrant<OAuth2AuthorizationCode> implements IOAuth2Grant {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    constructor(ctx: OAuth2AuthorizeGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
    }

    async runWith(
        authorizationCode: OAuth2AuthorizationCode,
        base: OAuth2TokenPayload = {},
    ) : Promise<OAuth2TokenGrantResponse> {
        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            ...base,
            sub: authorizationCode.sub,
            sub_kind: authorizationCode.sub_kind,
            realm_id: authorizationCode.realm_id,
            realm_name: authorizationCode.realm_name,
            scope: authorizationCode.scope,
            client_id: authorizationCode.client_id,
        });

        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(accessTokenPayload);

        const buildContext : OAuth2BearerResponseBuildContext = {
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        };

        if (
            authorizationCode.scope &&
            hasOAuth2Scopes(authorizationCode.scope, ScopeName.OPEN_ID)
        ) {
            buildContext.idToken = authorizationCode.id_token;
        }

        return buildOAuth2BearerTokenResponse(buildContext);
    }
}
