/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2OpenIdTokenPayload } from '@authup/kit';
import { OAuth2TokenKind } from '@authup/kit';
import { resolveOpenIdClaimsFromSubEntity } from '../../openid';
import { loadOAuth2SubEntity } from '../sub';
import { buildOAuth2AccessTokenPayload } from './access-token';
import type { OAuth2OpenIdTokenBuildContext } from './type';

export function buildOpenIdTokenPayload(
    context: OAuth2OpenIdTokenBuildContext,
) : OAuth2OpenIdTokenPayload {
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
    payload: OAuth2OpenIdTokenPayload,
) : Promise<OAuth2OpenIdTokenPayload> {
    if (!payload.sub_kind || !payload.sub) {
        return payload;
    }

    const claims : Partial<OAuth2OpenIdTokenPayload> = resolveOpenIdClaimsFromSubEntity(
        payload.sub_kind,
        await loadOAuth2SubEntity(payload.sub_kind, payload.sub, payload.scope),
    );

    return {
        ...payload,
        ...claims,
    };
}
