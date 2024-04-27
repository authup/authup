/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/core-kit';
import { ErrorCode, TokenError } from '@authup/core-kit';
import { buildRedisKeyPath, extractTokenHeader } from '@authup/server-kit';
import { isHTTPError } from '@ebec/http';
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
                    id: header.kid,
                }),
                milliseconds: 60.000,
            },
        });

        if (entity) {
            try {
                return await verifyOAuth2TokenWithKey(token, entity);
            } catch (e) {
                if (isHTTPError(e)) {
                    if (e.code === ErrorCode.TOKEN_EXPIRED) {
                        throw TokenError.expired();
                    }
                }

                throw e;
            }
        }
    }

    throw TokenError.payloadInvalid('The jwt key id is invalid or not present.');
}
