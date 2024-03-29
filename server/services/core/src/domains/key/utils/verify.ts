/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenVerifyOptions } from '@authup/server-kit';
import { verifyToken } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/core';
import {
    KeyType, wrapPrivateKeyPem, wrapPublicKeyPem,
} from '@authup/core';
import type { KeyEntity } from '../entity';

export async function verifyOAuth2TokenWithKey(
    token: string,
    entity: KeyEntity,
) : Promise<OAuth2TokenPayload> {
    if (entity.type === KeyType.OCT) {
        return verifyToken(
            token,
            {
                type: KeyType.OCT,
                key: Buffer.from(entity.decryption_key, 'base64'),
            },
        );
    }

    return verifyToken(
        token,
        {
            type: entity.type,
            keyPair: {
                publicKey: wrapPublicKeyPem(entity.encryption_key),
                privateKey: wrapPrivateKeyPem(entity.decryption_key),
            },
            ...(entity.signature_algorithm ? { algorithms: [entity.signature_algorithm] } : []),
        } as TokenVerifyOptions,
    );
}
