/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/kit';
import { TokenError } from '@authup/kit';
import { buildRedisKeyPath, extractTokenHeader } from '@authup/server-kit';
import { useDataSource } from 'typeorm-extension';
import { KeyEntity, verifyOAuth2TokenWithKey } from '../../../../domains';
import { useOAuth2Cache } from '../../cache';
import type { OAuth2TokenReadOptions } from './types';

export async function readOAuth2TokenPayload(
    token: string,
    options: OAuth2TokenReadOptions = {},
) : Promise<OAuth2TokenPayload> {
    if (!token) {
        throw TokenError.requestInvalid('The token is not defined.');
    }

    const oauth2Cache = useOAuth2Cache();
    let payload : OAuth2TokenPayload | undefined;
    if (!options.skipCacheGet) {
        payload = await oauth2Cache.getClaimsByToken(token);
    }

    if (payload) {
        return payload;
    }

    const header = extractTokenHeader(token);

    if (header.kid) {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(KeyEntity);
        const entity = await repository.findOne({
            select: {
                id: true,
                type: true,
                signature_algorithm: true,
                encryption_key: true,
                decryption_key: true,
            },
            where: {
                id: header.kid,
            },
            cache: {
                id: buildRedisKeyPath({
                    prefix: 'realm_key',
                    key: header.kid,
                }),
                milliseconds: 60_000,
            },
        });

        if (entity) {
            payload = await verifyOAuth2TokenWithKey(token, entity);

            if (!options.skipCacheSet) {
                await oauth2Cache.setClaims(payload);
                await oauth2Cache.setIdByToken(token, payload.jti, {
                    ttl: oauth2Cache.transformExpToTTL(payload.exp),
                });
            }

            return payload;
        }
    }

    throw TokenError.payloadInvalid('The jwt key id (kid) is invalid or not present.');
}
