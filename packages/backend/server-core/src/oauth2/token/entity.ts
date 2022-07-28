/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2TokenKind,
} from '@authelion/common';
import { NotFoundError } from '@typescript-error/http';
import { OAuth2AccessTokenCache, OAuth2RefreshTokenCache } from '../cache';
import { OAuth2AccessTokenEntity, OAuth2RefreshTokenEntity } from '../../domains';

type Payload<T extends `${OAuth2TokenKind}` | OAuth2TokenKind> =
    T extends `${OAuth2TokenKind.ACCESS}` | OAuth2TokenKind.ACCESS ?
        OAuth2AccessTokenEntity :
        T extends `${OAuth2TokenKind.REFRESH}` | OAuth2TokenKind.REFRESH ?
            OAuth2RefreshTokenEntity :
            never;

export async function loadOAuth2TokenEntity<
    T extends `${OAuth2TokenKind}` | OAuth2TokenKind,
>(
    kind: T,
    id: string,
) : Promise<Payload<T>> {
    let payload : OAuth2AccessTokenEntity | OAuth2RefreshTokenEntity;

    switch (kind) {
        case OAuth2TokenKind.ACCESS: {
            const cache = new OAuth2AccessTokenCache();
            payload = await cache.get(id);
            break;
        }
        case OAuth2TokenKind.REFRESH: {
            const cache = new OAuth2RefreshTokenCache();

            payload = await cache.get(id) as OAuth2RefreshTokenEntity;
            break;
        }
    }

    if (!payload) {
        throw new NotFoundError();
    }

    return payload as Payload<T>;
}
