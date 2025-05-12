/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { deserializeOAuth2Scope } from '@authup/core-kit';
import type { OpenIDTokenPayload } from '@authup/specs';
import { OAuth2TokenKind } from '@authup/specs';
import { resolveOpenIdClaimsFromSubEntity } from '../../openid';
import { loadOAuth2SubEntity } from '../sub';
import { buildOAuth2AccessTokenPayload } from './access-token';
import type { OAuth2OpenIdTokenBuildContext } from './type';

export function buildOpenIdTokenPayload(
    context: OAuth2OpenIdTokenBuildContext,
) : OpenIDTokenPayload {
    const utc = Math.floor(new Date().getTime() / 1000);

    return {
        ...buildOAuth2AccessTokenPayload(context),
        kind: OAuth2TokenKind.ID_TOKEN,
        auth_time: utc,
        exp: utc + (context.maxAge || 3600),
        updated_at: utc,
    };
}

export async function extendOpenIdTokenPayload(
    payload: OpenIDTokenPayload,
) : Promise<OpenIDTokenPayload> {
    if (!payload.sub_kind || !payload.sub) {
        return payload;
    }

    const claims : Partial<OpenIDTokenPayload> = resolveOpenIdClaimsFromSubEntity(
        payload.sub_kind,
        await loadOAuth2SubEntity(
            payload.sub_kind,
            payload.sub,
            payload.scope ? deserializeOAuth2Scope(payload.scope) : [],
        ),
    );

    return {
        ...payload,
        ...claims,
    };
}
