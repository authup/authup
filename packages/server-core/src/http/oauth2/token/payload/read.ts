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

export async function readOAuth2TokenPayload(token: string) : Promise<OAuth2TokenPayload> {
    if (typeof token === 'undefined' || token === null) {
        throw TokenError.requestInvalid('The token is not defined.');
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
            return verifyOAuth2TokenWithKey(token, entity);
        }
    }

    throw TokenError.payloadInvalid('The jwt key id (kid) is invalid or not present.');
}
