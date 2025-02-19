/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { transformOAuth2ScopeToArray } from '@authup/core-kit';
import {
    OAuth2TokenKind,
    TokenError,
} from '@authup/specs';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { BearerAuthorizationHeader } from 'hapic';
import type { Request } from 'routup';
import { useDataSource } from 'typeorm-extension';
import {
    CachePrefix, RealmEntity,
} from '../../../../database/domains';
import { OAuth2TokenManager, loadOAuth2SubEntity } from '../../../oauth2';
import {
    setRequestIdentity,
    setRequestScopes,
    setRequestToken,
} from '../../../request';

export async function verifyBearerAuthorizationHeader(
    request: Request,
    header: BearerAuthorizationHeader,
) {
    const tokenManager = new OAuth2TokenManager();
    const payload = await tokenManager.verify(header.token);
    if (payload.kind !== OAuth2TokenKind.ACCESS) {
        throw TokenError.accessTokenRequired();
    }

    setRequestToken(request, header.token);
    setRequestScopes(request, transformOAuth2ScopeToArray(payload.scope));

    const sub = await loadOAuth2SubEntity(
        payload.sub_kind,
        payload.sub,
        payload.scope,
    );

    if (!payload.realm_id) {
        throw TokenError.realmIdInvalid();
    }

    let realmName: string;

    if (payload.realm_name) {
        realmName = payload.realm_name;
    } else {
        const dataSource = await useDataSource();
        const realmRepository = dataSource.getRepository(RealmEntity);
        const realm = await realmRepository.findOne({
            where: {
                id: payload.realm_id,
            },
            cache: {
                id: buildRedisKeyPath({
                    prefix: CachePrefix.REALM,
                    key: payload.realm_id,
                }),
                milliseconds: 60_000,
            },
        });

        realmName = realm.name;
    }

    setRequestIdentity(request, {
        type: payload.sub_kind,
        id: payload.sub,
        attributes: sub,
        clientId: payload.client_id,
        realmId: payload.realm_id,
        realmName,
    });
}
