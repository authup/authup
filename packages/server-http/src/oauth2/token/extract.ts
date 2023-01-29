/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2TokenPayload,
    TokenError,
} from '@authup/common';
import { decodeToken } from '@authup/server-common';
import { buildKeyPath } from 'redis-extension';
import { useDataSource } from 'typeorm-extension';
import { KeyEntity, verifyOAuth2TokenWithKey } from '@authup/server-database';

export async function extractOAuth2TokenPayload(token: string) : Promise<OAuth2TokenPayload> {
    if (typeof token === 'undefined' || token === null) {
        throw TokenError.requestInvalid('The token is not defined.');
    }

    const payload = decodeToken(token, { complete: true });
    if (!payload) {
        throw TokenError.payloadInvalid('The token could not be decoded.');
    }

    if (payload.header.kid) {
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
                id: payload.header.kid,
            },
            cache: {
                id: buildKeyPath({
                    prefix: 'realm_key',
                    id: payload.header.kid,
                }),
                milliseconds: 60.000,
            },
        });

        if (entity) {
            return verifyOAuth2TokenWithKey(token, entity);
        }
    }

    throw TokenError.payloadInvalid('The jwt key id is invalid or not present.');
}
