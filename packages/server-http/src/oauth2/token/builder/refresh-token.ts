/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2RefreshToken, OAuth2SubKind, OAuth2TokenKind, OAuth2TokenPayload,
} from '@authup/common';
import { randomUUID } from 'node:crypto';
import { OAuth2RefreshTokenBuildContext } from './type';

export function buildOAuth2RefreshTokenPayload(
    context: OAuth2RefreshTokenBuildContext,
) : Partial<OAuth2TokenPayload> {
    return {
        kind: OAuth2TokenKind.REFRESH,
        jti: context.id || randomUUID(),
        sub: context.sub,
        sub_kind: context.subKind,
        client_id: context.clientId,
        realm_id: context.realmId,
        realm_name: context.realmName,
        ...(context.scope ? { scope: context.scope } : {}),
    };
}

export function transformToRefreshTokenPayload(
    accessToken: Partial<OAuth2TokenPayload>,
    refreshToken?: Partial<OAuth2RefreshTokenBuildContext>,
) : Partial<OAuth2TokenPayload> {
    return buildOAuth2RefreshTokenPayload({
        ...(refreshToken || {}),
        sub: accessToken.sub,
        subKind: accessToken.sub_kind,
        clientId: accessToken.client_id,
        realmId: accessToken.realm_id,
        realmName: accessToken.realm_name,
        scope: accessToken.scope,
    });
}

export function transformToRefreshTokenEntity(
    accessToken: Partial<OAuth2TokenPayload>,
    maxAge?: number,
) : Partial<OAuth2RefreshToken> {
    return {
        client_id: accessToken.client_id,
        expires: new Date(Date.now() + (1000 * (maxAge || 7200))).toISOString(),
        scope: accessToken.scope,
        access_token: accessToken.jti,
        realm_id: accessToken.realm_id,
        ...(accessToken.sub_kind === OAuth2SubKind.USER ? { user_id: accessToken.sub } : {}),
        ...(accessToken.sub_kind === OAuth2SubKind.ROBOT ? { robot_id: accessToken.sub } : {}),
    };
}
