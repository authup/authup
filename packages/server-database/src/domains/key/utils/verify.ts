/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenVerifyOptions, verifyToken } from '@authup/server-common';
import {
    KeyType, OAuth2TokenPayload, wrapPrivateKeyPem, wrapPublicKeyPem,
} from '@authup/common';
import { KeyEntity } from '../entity';

export async function verifyOAuth2TokenWithKey(
    token: string,
    entity: KeyEntity,
    options?: Omit<TokenVerifyOptions, 'type' | 'algorithms' | 'keyPair' | 'secret'>,
) : Promise<OAuth2TokenPayload> {
    if (entity.type === KeyType.OCT) {
        return await verifyToken(
            token,
            {
                type: KeyType.OCT,
                secret: Buffer.from(entity.decryption_key, 'base64'),
                ...options,
            },
        ) as OAuth2TokenPayload;
    }

    return await verifyToken(
        token,
        {
            type: entity.type,
            keyPair: {
                publicKey: wrapPublicKeyPem(entity.encryption_key),
                privateKey: wrapPrivateKeyPem(entity.decryption_key),
            },
            ...(entity.signature_algorithm ? { algorithms: [entity.signature_algorithm] } : {}),
            ...options,
        } as TokenVerifyOptions,
    ) as OAuth2TokenPayload;
}
