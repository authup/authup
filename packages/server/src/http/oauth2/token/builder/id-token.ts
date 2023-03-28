/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2OpenIdTokenPayload } from '@authup/common';
import { OAuth2TokenKind } from '@authup/common';
import { randomUUID } from 'node:crypto';
import { resolveOpenIdClaimsFromSubEntity } from '../../openid';
import { loadOAuth2SubEntity } from '../sub';
import type { OAuth2OpenIdTokenBuildContext } from './type';

export function buildOpenIdTokenPayload(
    context: OAuth2OpenIdTokenBuildContext,
) : Partial<OAuth2OpenIdTokenPayload> {
    return {
        kind: OAuth2TokenKind.ID_TOKEN,
        jti: randomUUID(),
        iss: context.issuer,
        sub: context.sub,
        sub_kind: context.subKind,
        remote_address: context.remoteAddress,
        aud: context.clientId,
        client_id: context.clientId,
        realm_id: context.realmId,
        realm_name: context.realmName,
        auth_time: new Date().getTime(),
        ...(context.scope ? { scope: context.scope } : {}),
    };
}

export async function extendOpenIdTokenPayload(
    payload: Partial<OAuth2OpenIdTokenPayload>,
) : Promise<Partial<OAuth2OpenIdTokenPayload>> {
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
