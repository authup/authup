/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { transformOAuth2ScopeToArray } from '@authup/core-kit';
import {
    OAuth2TokenKind, TokenError,
} from '@authup/kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { BearerAuthorizationHeader } from 'hapic';
import type { Request } from 'routup';
import { useDataSource } from 'typeorm-extension';
import {
    CachePrefix, RealmEntity,
} from '../../../../domains';
import { OAuth2TokenManager, loadOAuth2SubEntity } from '../../../oauth2';
import { setRequestEnv, setRequestIdentity } from '../../../request';

export async function verifyBearerAuthorizationHeader(
    request: Request,
    header: BearerAuthorizationHeader,
) {
    const tokenManager = new OAuth2TokenManager();
    const payload = await tokenManager.verify(header.token);
    if (payload.kind !== OAuth2TokenKind.ACCESS) {
        throw TokenError.accessTokenRequired();
    }

    setRequestEnv(request, 'token', header.token);
    setRequestEnv(request, 'scopes', transformOAuth2ScopeToArray(payload.scope));

    const sub = await loadOAuth2SubEntity(
        payload.sub_kind,
        payload.sub,
        payload.scope,
    );

    let realmId : string;
    let realmName: string;

    if (payload.realm_name) {
        realmName = payload.realm_name;
        realmId = payload.realm_id;
    } else {
        // todo: check realm_id, but it should always be given.
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
        realmId = realm.id;
    }

    setRequestIdentity(request, {
        type: payload.sub_kind,
        id: payload.sub,
        attributes: sub,
        realmId,
        realmName,
    });
}
