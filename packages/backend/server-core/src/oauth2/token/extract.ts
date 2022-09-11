/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2TokenPayload,
    TokenError,
} from '@authelion/common';
import { decodeToken } from '@authelion/server-utils';
import { useDataSource } from 'typeorm-extension';
import { KeyEntity, verifyOAuth2TokenWithKey } from '../../domains';

export async function extractOAuth2TokenPayload(token: string) : Promise<OAuth2TokenPayload> {
    const { header } = decodeToken(token, { complete: true });

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
            cache: 60.000,
        });

        if (entity) {
            return verifyOAuth2TokenWithKey(token, entity);
        }
    }

    throw TokenError.payloadInvalid('The jwt key id is invalid or not present.');
}
